from fastapi import APIRouter

from app.api.endpoints import analytics, auth, coach, insights, journal, mood, user

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(mood.router, prefix="/moods", tags=["moods"])
api_router.include_router(journal.router, prefix="/journal", tags=["journal"])
api_router.include_router(coach.router, prefix="/coach", tags=["coach"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(insights.router, prefix="/insights", tags=["insights"])