import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings

MODEL = "gemini-3.6-flash"


class GeminiService:
    """Service boundary for structured Gemini interactions.

    Keeps all Google GenAI SDK calls here so routes stay focused on HTTP
    validation and persistence.
    """

    def __init__(self) -> None:
        self.client = (
            genai.Client(api_key=settings.gemini_api_key)
            if settings.gemini_api_key
            else None
        )

    def _generate(self, prompt: str, schema: dict[str, Any], temperature: float = 0.3) -> dict[str, Any]:
        if not self.client:
            return {}
        response = self.client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
                temperature=temperature,
            ),
        )
        parsed = getattr(response, "parsed", None)
        if parsed:
            return parsed
        raw = getattr(response, "text", None)
        if raw:
            try:
                return json.loads(raw)
            except Exception:
                pass
        data = getattr(response, "json", None)
        if callable(data):
            try:
                return data()
            except Exception:
                pass
        return {}

    def reflect(self, journal_text: str) -> dict[str, Any]:
        if not self.client:
            return {
                "summary": "Gemini is not configured yet.",
                "themes": [],
                "emotion": "unknown",
                "reflection_prompt": "Add GEMINI_API_KEY to backend/.env to enable AI reflections.",
            }
        schema = {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "themes": {"type": "array", "items": {"type": "string"}},
                "emotion": {"type": "string"},
                "reflection_prompt": {"type": "string"},
            },
            "required": ["summary", "themes", "emotion", "reflection_prompt"],
        }
        prompt = (
            "You are a gentle mental-wellness reflection assistant. Do not diagnose, "
            "prescribe, or make clinical claims. Reflect only on the journal text provided.\n\n"
            f"Journal:\n{journal_text}"
        )
        return self._generate(prompt, schema, temperature=0.3)

    def analyze_journal_entry(self, text: str) -> dict[str, Any]:
        if not self.client:
            return {
                "sentiment_score": 0.0,
                "detected_mood": "neutral",
                "cognitive_reframe": (
                    "To unlock your personalised reflection, add GEMINI_API_KEY to backend/.env."
                ),
            }
        schema = {
            "type": "object",
            "properties": {
                "sentiment_score": {"type": "number"},
                "detected_mood": {"type": "string"},
                "cognitive_reframe": {"type": "string"},
            },
            "required": ["sentiment_score", "detected_mood", "cognitive_reframe"],
        }
        prompt = (
            "You are a compassionate cognitive-behavioural wellness assistant. Analyse the "
            "user's journal entry and return JSON with exactly these fields:\n"
            '- "sentiment_score": a float between -1.0 (very negative) and 1.0 (very positive).\n'
            '- "detected_mood": a single short label for the dominant mood (e.g. "anxious", "calm", "sad").\n'
            '- "cognitive_reframe": one empathetic, practical, non-clinical reframe (2-3 sentences) '
            'that gently acknowledges the feeling and offers a grounded perspective. Never diagnose or prescribe.\n\n'
            f"Journal entry:\n{text}"
        )
        result = self._generate(prompt, schema, temperature=0.4)
        # Normalise with defaults if the model returned a partial object.
        return {
            "sentiment_score": float(result.get("sentiment_score", 0.0)),
            "detected_mood": str(result.get("detected_mood", "neutral")),
            "cognitive_reframe": str(
                result.get(
                    "cognitive_reframe",
                    "Thank you for writing this down. It takes courage to name how you feel.",
                )
            ),
        }

    def coach_chat(self, chat_history: list[dict[str, str]]) -> str:
        if not self.client:
            return (
                "I'd love to reflect with you, but the AI service isn't configured yet. "
                "Add GEMINI_API_KEY to backend/.env and we can talk properly."
            )
        system = (
            "You are a compassionate, grounded cognitive-behavioural wellness assistant "
            "called mindsync coach. You are warm, brief, and non-clinical. You never diagnose, "
            "prescribe, or make medical claims. You reflect feelings back, ask one gentle open "
            "question, and gently notice patterns. Keep replies to 2-4 sentences unless the user "
            "asks for more. If the user mentions self-harm or a crisis, respond with a caring, "
            "direct message encouraging them to reach out to a trusted person or a helpline."
        )
        turns: list[types.Content] = []
        for msg in chat_history[-20:]:
            role = msg.get("role", "user")
            if role == "assistant":
                role = "model"
            elif role != "user":
                role = "user"
            turns.append(
                types.Content(role=role, parts=[types.Part(text=msg.get("content", ""))])
            )
        response = self.client.models.generate_content(
            model=MODEL,
            contents=turns,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.7,
            ),
        )
        text = getattr(response, "text", None)
        if text:
            return text.strip()
        return "Ask me anything and I'll reflect it back."

    def generate_insights(self, user_stats_summary: str) -> dict[str, Any]:
        if not self.client:
            return {
                "recommendations": [
                    "Add GEMINI_API_KEY to backend/.env to unlock personalised wellness insights."
                ],
                "trigger_patterns": [],
                "summary": "No insight data available yet.",
            }
        schema = {
            "type": "object",
            "properties": {
                "recommendations": {"type": "array", "items": {"type": "string"}},
                "trigger_patterns": {"type": "array", "items": {"type": "string"}},
                "summary": {"type": "string"},
            },
            "required": ["recommendations", "trigger_patterns", "summary"],
        }
        prompt = (
            "You are a grounding, evidence-friendly mental-wellness insight assistant. "
            "Given a 30-day summary of mood and energy check-ins, produce compassionate, "
            "actionable guidance. Never diagnose or prescribe.\n"
            "Return JSON with exactly:\n"
            '- "recommendations": array of 3-5 short actionable bullets.\n'
            '- "trigger_patterns": array of observed trigger patterns as plain strings.\n'
            '- "summary": one-sentence overview.\n\n'
            f"30-day user stats summary:\n{user_stats_summary}"
        )
        return self._generate(prompt, schema, temperature=0.5)


gemini_service = GeminiService()