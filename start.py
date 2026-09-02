import os
import sys

from dotenv import load_dotenv
from mem0 import MemoryClient
from groq import Groq

load_dotenv()

# -----------------------------
# API KEYS
# -----------------------------

mem0_api_key = os.getenv("MEM0_API_KEY")
groq_api_key = os.getenv("GROQ_API_KEY")

if not mem0_api_key:
    raise RuntimeError("MEM0_API_KEY was not found.")

if not groq_api_key:
    raise RuntimeError("GROQ_API_KEY was not found.")


# -----------------------------
# CLIENTS
# -----------------------------

memory_client = MemoryClient(api_key=mem0_api_key)
ai_client = Groq(api_key=groq_api_key)


# -----------------------------
# USER
# -----------------------------

user_id = "yash"

print("Yash AI")
print("Type something you want the AI to remember.")
print("Type 'search' to search your memories.")
print("Type 'exit' to close the program.\n")


# -----------------------------
# MAIN LOOP
# -----------------------------

while True:

    user_input = input("You: ")

    # EXIT
    if user_input.lower() == "exit":
        print("Goodbye!")
        break

    # SEARCH MEMORY
    elif user_input.lower() == "search":

        question = input("Ask about your saved memories: ")

        # Search Mem0
        results = memory_client.search(
            question,
            filters={
                "user_id": user_id
            }
        )

        memories = results.get("results", [])

        if not memories:
            print("AI: I don't have that information.\n")
            continue

        # Extract memory text only
        memory_text = "\n".join(
            item.get("memory", "")
            for item in memories
        )

        # -----------------------------
        # SEND TO GROQ (Streaming)
        # -----------------------------

        prompt = f"""
You are Yash's personal memory assistant.

The user asked:
{question}

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

        print("AI: ", end="", flush=True)

        try:
            completion = ai_client.chat.completions.create(
                model="groq/compound",
                messages=[
                  {
                    "role": "user",
                    "content": prompt
                  }
                ],
                temperature=0.2,
                max_completion_tokens=2048,
                top_p=1,
                stream=True,
                stop=None,
                compound_custom={"tools": {"enabled_tools": ["code_interpreter"]}}
            )

            # Print each chunk as it streams in
            for chunk in completion:
                print(chunk.choices[0].delta.content or "", end="", flush=True)
            
            print("\n") # Add a final newline when the stream finishes

        except Exception as e:
            print(f"\n[Error connecting to Groq: {e}]\n")

    # ADD MEMORY
    else:
        memory_client.add(
            messages=[{"role": "user", "content": user_input}], 
            user_id=user_id
        )
        print("AI: Memory saved!\n")