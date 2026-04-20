import json
from .ollama_service import chat_once

BASE_SECTIONS = [
    {
        "id": "intro",
        "name": "Introduction & Background",
        "description": "Get to know the candidate's background and motivations",
        "questions": [
            "Tell me about yourself — your background, experience, and what you've been working on recently.",
            "What motivated you to apply for this position, and what excites you most about it?",
            "Walk me through your most significant professional achievement and what you learned from it.",
            "How do you stay current with new technologies and industry trends?",
        ],
    },
    {
        "id": "behavioral",
        "name": "Behavioral & Situational",
        "description": "Assess soft skills and how the candidate handles real-world situations",
        "questions": [
            "Describe a time you worked under a very tight deadline. How did you prioritize and what was the outcome?",
            "Tell me about a time you disagreed with a teammate or manager. How did you handle it?",
            "Describe a project that didn't go as planned. What happened and what would you do differently?",
            "Tell me about a time you had to quickly learn an unfamiliar technology or domain to solve a problem.",
        ],
    },
    {
        "id": "oop",
        "name": "Object-Oriented Programming",
        "description": "Core OOP concepts and principles",
        "questions": [
            "Explain the four pillars of object-oriented programming with real-world examples.",
            "What is the difference between abstraction and encapsulation? When would you use each?",
            "Compare inheritance vs composition. What are the tradeoffs and when do you prefer one over the other?",
            "What are the SOLID principles? Walk me through each one with a brief example.",
            "Explain polymorphism — what are the different types and how do they differ?",
        ],
    },
    {
        "id": "data_structures",
        "name": "Data Structures",
        "description": "Fundamental data structures and their trade-offs",
        "questions": [
            "When would you choose a linked list over an array, and vice versa?",
            "Explain how a hash map works internally, including collision handling strategies.",
            "What is the difference between a stack and a queue? Give a real-world use case for each.",
            "Explain tree traversal — compare BFS and DFS, and when would you choose each?",
            "What is a heap data structure and what problems is it best suited for?",
        ],
    },
    {
        "id": "algorithms",
        "name": "Algorithms & Complexity",
        "description": "Algorithm design, analysis, and problem-solving",
        "questions": [
            "Explain Big O notation. Give examples of O(1), O(log n), O(n), O(n log n), and O(n²) operations.",
            "Walk me through how you would find if an array contains duplicates — optimize for time, then for space.",
            "Explain dynamic programming. What makes a problem a good candidate for it? Give an example.",
            "How does binary search work and what are its requirements? What is its time complexity?",
            "Compare sorting algorithms — when would you use merge sort vs quicksort vs insertion sort?",
        ],
    },
]


async def analyze_job_description(job_description: str) -> dict:
    if not job_description or len(job_description.strip()) < 50:
        return {"skills": [], "technologies": [], "questions": []}

    prompt = f"""Analyze this job description and respond ONLY with valid JSON (no markdown, no extra text).

Extract:
1. Key technical skills required (max 8)
2. Technologies/frameworks/tools mentioned (max 8)
3. Generate 5 specific technical interview questions based on these requirements

Job Description:
{job_description[:3000]}

Respond with exactly this JSON structure:
{{
  "skills": ["skill1", "skill2"],
  "technologies": ["tech1", "tech2"],
  "questions": [
    "Specific question 1?",
    "Specific question 2?",
    "Specific question 3?",
    "Specific question 4?",
    "Specific question 5?"
  ]
}}"""

    try:
        response = await chat_once([{"role": "user", "content": prompt}])
        # Extract JSON from response (handle cases where model adds extra text)
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except Exception:
        pass
    return {"skills": [], "technologies": [], "questions": []}


def build_interview_plan(job_analysis: dict) -> list[dict]:
    sections = [s.copy() for s in BASE_SECTIONS]
    # Deep copy questions lists
    for s in sections:
        s["questions"] = list(s["questions"])

    if job_analysis.get("questions"):
        tech_list = ", ".join(job_analysis.get("technologies", []) + job_analysis.get("skills", []))
        sections.append({
            "id": "job_specific",
            "name": "Role-Specific Technical Questions",
            "description": f"Topics specific to this role: {tech_list}",
            "questions": job_analysis["questions"],
        })

    return sections


def build_system_prompt(session: dict, sections: list[dict]) -> str:
    sections_text = ""
    for i, section in enumerate(sections):
        questions_text = "\n".join(f"  {j+1}. {q}" for j, q in enumerate(section["questions"]))
        sections_text += f"\nSection {i+1}: {section['name']}\n{questions_text}\n"

    company_str = f" at {session['company']}" if session.get("company") else ""

    return f"""You are Alex, a professional senior technical interviewer conducting a structured mock interview.

CANDIDATE: {session['user_name']}
TARGET ROLE: {session['position']}{company_str}

INTERVIEW PLAN — follow this exactly, in order:
{sections_text}

STRICT RULES:
1. Ask exactly ONE question at a time. Never ask multiple questions at once.
2. NEVER repeat a question that already appears in the conversation history. Read the full history above before choosing the next question.
3. After the candidate answers, give structured feedback:
   ✓ Strengths: [what was good]
   △ Improve: [specific suggestions]
   Score: [X/10]
4. After feedback, ask the NEXT unasked question in the current section. When ALL questions in a section are done, output the exact marker [NEXT_SECTION] on its own line, then introduce and begin the next section.
5. NEVER say the interview is finished, complete, or over. The candidate controls when to end the session. Keep going until all sections and questions are fully covered.
6. If a candidate is stuck, offer one small hint.
7. Keep a professional but warm and encouraging tone.
8. After ALL sections are exhausted, provide a full evaluation summary:
   - Score per section
   - Top 3 strengths
   - Top 3 areas to improve
   - Overall recommendation (Ready / Almost Ready / Needs More Prep)
   Then wait for the candidate to end the session.

START: Greet {session['user_name']} professionally, confirm the role they're preparing for, then begin Section 1 with the first question."""
