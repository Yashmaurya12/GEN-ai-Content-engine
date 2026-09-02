import os
from dotenv import load_dotenv
from mem0 import MemoryClient
from groq import Groq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

load_dotenv()

# Setup Clients
memory_client = MemoryClient(api_key=os.getenv("MEM0_API_KEY"))
ai_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
user_id = "yash"

# Initialize FastAPI
app = FastAPI(title="Yash AI Memory API")

# Enable CORS so the browser frontend can communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define what data the API expects to receive
class MemoryItem(BaseModel):
    text: str

class QueryItem(BaseModel):
    question: str

@app.get("/")
def read_root():
    return {"message": "AI Memory API is running!"}

@app.post("/add_memory")
def add_memory(item: MemoryItem):
    """Endpoint to save a new memory."""
    try:
        memory_client.add(
            messages=[{"role": "user", "content": item.text}], 
            user_id=user_id
        )
        return {"message": "Memory saved successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search_memory")
def search_memory(query: QueryItem):
    """Endpoint to search memories and get an AI response."""
    try:
        # 1. Search Mem0
        results = memory_client.search(query.question, filters={"user_id": user_id})
        memories = results.get("results", []) if isinstance(results, dict) else results

        if not memories:
            return {"ai_response": "I don't have that information."}

        # 2. Extract Text
        memory_text = "\n".join(item.get("memory", "") for item in memories)

        # 3. Prompt Setup
        prompt = f"""
You are Yash's personal memory assistant.

The user asked:
{query.question}

Here are the relevant memories:
{memory_text}

Answer the user's question using ONLY
the information contained in these memories.

Rules:
- Give only the answer.
- Do not explain your reasoning.
- Do not mention Mem0.
- Do not mention the memory system.
- Keep the answer short.
- If the answer is a number, return only the number.
- If the information is unavailable, say:
"I don't have that information."
"""

        # 4. Ask Groq
        response = ai_client.chat.completions.create(
            model="groq/compound",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_completion_tokens=512,
            top_p=1,
            stream=False,
            stop=None,
            compound_custom={"tools": {"enabled_tools": ["code_interpreter"]}}
        )
        answer = response.choices[0].message.content
        return {"ai_response": answer}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)