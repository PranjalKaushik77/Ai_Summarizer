import os
import uuid
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Google Generative AI API configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyDe82ONIQCaR5JfxZEp9Tr6v00ZquU3ifw")
GOOGLE_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GOOGLE_API_KEY}"

# In-memory storage for summaries (for this session only)
summaries_store = {}

class SummaryRequest(BaseModel):
    transcript: str
    custom_prompt: str

class SummaryUpdate(BaseModel):
    summary_id: str
    updated_summary: str

@app.get("/")
async def root():
    return {"message": "Meeting Notes API is running", "status": "healthy"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Meeting Notes API is running"}

@app.post("/api/upload-transcript")
async def upload_transcript(file: UploadFile = File(...)):
    """Upload and process transcript file"""
    try:
        # Check file type
        if not file.filename.endswith('.txt'):
            raise HTTPException(status_code=400, detail="Only .txt files are allowed")
        
        # Check file size (limit to 10MB)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File size too large. Maximum 10MB allowed")
        
        # Decode content
        try:
            transcript_text = file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                transcript_text = file_content.decode('latin-1')
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="File encoding not supported. Please use UTF-8")
        
        if not transcript_text.strip():
            raise HTTPException(status_code=400, detail="File is empty")
        
        return {
            "success": True,
            "transcript": transcript_text,
            "filename": file.filename,
            "message": "Transcript uploaded successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/api/generate-summary")
async def generate_summary(request: SummaryRequest):
    """Generate AI summary using Google Generative AI"""
    try:
        # Validate input
        if not request.transcript.strip():
            raise HTTPException(status_code=400, detail="Transcript cannot be empty")
        
        if not request.custom_prompt.strip():
            raise HTTPException(status_code=400, detail="Custom prompt cannot be empty")
        
        # Prepare the prompt for Gemini
        combined_prompt = f"""
        Transcript:
        {request.transcript}
        
        Instruction:
        {request.custom_prompt}
        
        Please provide a well-structured summary based on the instruction above.
        """
        
        # Prepare request payload for Google Generative AI
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": combined_prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 2048,
            }
        }
        
        # Make API call to Google Generative AI
        headers = {"Content-Type": "application/json"}
        
        response = requests.post(
            GOOGLE_API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code != 200:
            error_detail = f"Google API error: {response.status_code}"
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_detail += f" - {error_data['error'].get('message', 'Unknown error')}"
            except:
                error_detail += f" - {response.text[:200]}"
            raise HTTPException(status_code=500, detail=error_detail)
        
        data = response.json()
        
        # Extract summary from response
        summary = "No summary generated."
        if (data.get("candidates") and 
            len(data["candidates"]) > 0 and 
            data["candidates"][0].get("content") and 
            data["candidates"][0]["content"].get("parts") and 
            len(data["candidates"][0]["content"]["parts"]) > 0):
            
            summary = data["candidates"][0]["content"]["parts"][0].get("text", "No summary generated.")
        
        # Generate unique summary ID
        summary_id = str(uuid.uuid4())
        
        # Store in memory (temporary storage for this session)
        summaries_store[summary_id] = {
            "summary_id": summary_id,
            "transcript": request.transcript,
            "custom_prompt": request.custom_prompt,
            "summary": summary
        }
        
        return {
            "success": True,
            "summary_id": summary_id,
            "summary": summary,
            "message": "Summary generated successfully"
        }
    
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="AI service timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

@app.put("/api/update-summary")
async def update_summary(request: SummaryUpdate):
    """Update an existing summary"""
    try:
        if not request.summary_id:
            raise HTTPException(status_code=400, detail="Summary ID is required")
        
        if not request.updated_summary.strip():
            raise HTTPException(status_code=400, detail="Updated summary cannot be empty")
        
        # Check if summary exists in memory
        if request.summary_id not in summaries_store:
            raise HTTPException(status_code=404, detail="Summary not found")
        
        # Update summary in memory
        summaries_store[request.summary_id]["summary"] = request.updated_summary
        
        return {
            "success": True,
            "message": "Summary updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating summary: {str(e)}")

@app.get("/api/get-summary/{summary_id}")
async def get_summary(summary_id: str):
    """Get a specific summary by ID"""
    try:
        if summary_id not in summaries_store:
            raise HTTPException(status_code=404, detail="Summary not found")
        
        summary_data = summaries_store[summary_id]
        
        return {
            "success": True,
            "summary": summary_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving summary: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)