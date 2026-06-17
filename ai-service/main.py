from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.routers import health

app = FastAPI(
    title="TrackBells ERP - AI Brain Service",
    description="AI-powered factory automation engine for shot calculation, shortage prediction, and analytics",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_origins=["http://49.13.70.253:3008", "http://49.13.70.253:9898"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, tags=["Health"])
from app.routers import predict, ocr, chat
app.include_router(predict.router)
app.include_router(ocr.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    return {"message": "TrackBells ERP AI Brain Service", "status": "running"}

if __name__ == "__main__":
    # uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    uvicorn.run("main:app", host="0.0.0.0", port=8989, reload=True)
