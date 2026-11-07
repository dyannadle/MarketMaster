from fastapi import APIRouter, Query
from app.services.news_service import NewsService

router = APIRouter()

@router.get("/feed")
async def get_news_feed(
    force_refresh: bool = Query(False, description="Bypass 10-minute cache and fetch latest headlines immediately")
):
    """
    Returns live financial and market news headlines for Indian equities and macro indicators.
    Automatically refreshes every 10 minutes with live countdown telemetry.
    """
    return await NewsService.get_live_news(force_refresh=force_refresh)
