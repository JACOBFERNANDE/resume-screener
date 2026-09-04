import os
import io
import json
import re

from flask import Flask, request, jsonify, render_template
import pdfplumber
import anthropic

app = Flask(__name__)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL_NAME = "claude-sonnet-4-6"


def extract_text_from_pdf(file_stream):
    """Extract raw text from an uploaded PDF file stream."""
    text_parts = []
    with pdfplumber.open(file_stream) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts).strip()


def build_prompt(resume_text, job_description):
    return f"""You are an expert technical recruiter. Compare the following resume with the job description below.

Return ONLY a JSON object (no markdown fences, no preamble) with this exact shape:
{{
  "score": <integer 1-10>,
  "justification": "<2-4 sentence explanation of the score>",
  "matched_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill1", "skill2", ...],
  "summary": "<one sentence candidate summary: role, years of experience, standout trait>"
}}

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""


def parse_llm_json(raw_text):
    """Best-effort extraction of a JSON object from the model's response."""
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return json.loads(cleaned)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    if "resume" not in request.files:
        return jsonify({"error": "No resume file uploaded."}), 400

    resume_file = request.files["resume"]
    job_description = request.form.get("job_description", "").strip()

    if resume_file.filename == "":
        return jsonify({"error": "No resume file selected."}), 400
    if not job_description:
        return jsonify({"error": "Job description is required."}), 400
    if not resume_file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF resume."}), 400

    try:
        file_bytes = resume_file.read()
        resume_text = extract_text_from_pdf(io.BytesIO(file_bytes))
    except Exception as e:
        return jsonify({"error": f"Could not read the PDF: {str(e)}"}), 400

    if not resume_text:
        return jsonify({"error": "No readable text found in that PDF (it may be a scanned image)."}), 400

    if not os.environ.get("ANTHROPIC_API_KEY"):
        return jsonify({"error": "Server is missing ANTHROPIC_API_KEY. Set it in your environment variables."}), 500

    try:
        prompt = build_prompt(resume_text, job_description)
        message = client.messages.create(
            model=MODEL_NAME,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = "".join(
            block.text for block in message.content if block.type == "text"
        )
        result = parse_llm_json(raw_text)
    except json.JSONDecodeError:
        return jsonify({"error": "Model response could not be parsed. Please try again."}), 502
    except Exception as e:
        return jsonify({"error": f"Scoring failed: {str(e)}"}), 502

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
