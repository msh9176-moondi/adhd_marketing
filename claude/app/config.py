import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL", "postgresql://localhost:5432/edibot")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "changeme")
TZ = os.getenv("TZ", "Asia/Seoul")
