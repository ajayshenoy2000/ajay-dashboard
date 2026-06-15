from __future__ import annotations

from functools import lru_cache

from backend.config import settings


@lru_cache
def get_client():
    """Server-side Supabase client using the service role key (bypasses RLS).
    Returns None if Supabase isn't configured, so callers can fall back to
    in-memory behavior during local dev without a .env entry."""
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_key)
