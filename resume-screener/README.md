# Docket — Smart Resume Screener

Upload a résumé (PDF) and a job description. Docket reads both, asks Claude to
weigh the fit, and returns a score out of 10 with a written justification,
matched skills, and missing skills.

## How it works

1. The résumé PDF is parsed into plain text with `pdfplumber`.
2. The résumé text and job description are sent to Claude in a single prompt
   asking for a structured JSON verdict (see `build_prompt` in `app.py`).
3. The JSON response (score, justification, matched/missing skills, summary)
   is parsed and rendered in the browser.

## Project structure

```
resume-screener/
├── app.py              # Flask backend: routes + LLM prompt + PDF parsing
├── requirements.txt
├── render.yaml          # Render deploy config
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

## Run locally

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

export ANTHROPIC_API_KEY=your_key_here   # Windows: set ANTHROPIC_API_KEY=your_key_here
python app.py
```

Visit `http://localhost:5000`.

## Deploy on Render

1. Push this project to a GitHub repo.
2. In the Render dashboard: **New +** → **Web Service** → connect your repo.
3. Render will detect `render.yaml` automatically (or set manually):
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `gunicorn app:app`
4. Under **Environment**, add `ANTHROPIC_API_KEY` with your actual key.
5. Click **Create Web Service**. Render will build and give you a public URL
   like `https://resume-screener.onrender.com`.

Note: on Render's free tier, the service spins down after inactivity, so the
first request after idle time can take 30–60 seconds to wake up.

## The LLM prompt

```
You are an expert technical recruiter. Compare the following resume with the job description below.

Return ONLY a JSON object (no markdown fences, no preamble) with this exact shape:
{
  "score": <integer 1-10>,
  "justification": "<2-4 sentence explanation of the score>",
  "matched_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill1", "skill2", ...],
  "summary": "<one sentence candidate summary: role, years of experience, standout trait>"
}

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
```

## Possible extensions

- Persist results to a database (Postgres) to build a shortlist across many candidates.
- Support multiple resume uploads at once, ranked by score.
- Add authentication if this is used by more than one recruiter.
- Extract structured resume fields (skills/education/experience) as a separate
  step before scoring, for reuse across multiple job descriptions.
