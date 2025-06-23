import requests
import json
import sys
import os

# --- Configuration ---
AGENT_URL = os.environ.get("AGENT_URL", "http://localhost:80")
START_ENDPOINT = f"{AGENT_URL}/start"
PROMPT_ENDPOINT = f"{AGENT_URL}/prompt"

# Use a session object to handle cookies automatically for the entire chat.
session = requests.Session()

def perform_web_search(query: str) -> str:
    """
    Performs a web search using the DuckDuckGo API and returns a summary.
    This uses a simple, unauthenticated API endpoint from DuckDuckGo.
    """
    print(f"\nPerforming web search for: {query}...", file=sys.stderr)
    try:
        search_url = "https://api.duckduckgo.com/"
        params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
        response = session.get(search_url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Extract the main abstract or first related topic for a concise result.
        if data.get("AbstractText"):
            return data["AbstractText"]
        elif data.get("RelatedTopics") and data["RelatedTopics"][0].get("Text"):
            return data["RelatedTopics"][0]["Text"]
        else:
            return "No definitive answer found."

    except requests.RequestException as e:
        return f"Error performing web search: {e}"
    except json.JSONDecodeError:
        return "Error: Could not parse search engine response."

def get_agent_response(endpoint: str, conversation_history: list):
    """
    Manages the conversation with the agent, including tool calls.
    """
    payload = {"messages": conversation_history}
    
    # --- 1. Send the prompt (or tool results) to the agent ---
    with session.post(endpoint, json=payload, stream=True) as response:
        response.raise_for_status()
        
        full_response_content = ""
        tool_calls = []

        # --- 2. Stream the agent's response (text and tool calls) ---
        for line in response.iter_lines():
            if not line:
                continue
            
            decoded_line = line.decode('utf-8')
            if decoded_line.startswith('data: '):
                data_str = decoded_line.split('data: ')[1]
                if "[DONE]" in data_str:
                    break
                try:
                    json_data = json.loads(data_str)
                    delta = json_data.get("choices", [{}])[0].get("delta", {})
                    
                    if "content" in delta and delta["content"]:
                        content_chunk = delta["content"]
                        print(content_chunk, end="", flush=True)
                        full_response_content += content_chunk
                    
                    if "tool_calls" in delta and delta["tool_calls"] is not None:
                        tool_calls.extend(delta["tool_calls"])

                except json.JSONDecodeError:
                    print(f"\nError decoding JSON: {data_str}", file=sys.stderr)

    # --- 3. If the agent requested a tool, execute it ---
    if tool_calls:
        # The agent's response so far becomes part of the conversation history.
        assistant_message = {"role": "assistant", "content": full_response_content, "tool_calls": tool_calls}
        conversation_history.append(assistant_message)
        
        # Execute tools and collect results.
        for tool_call in tool_calls:
            tool_name = tool_call.get("function", {}).get("name")
            if tool_name == "web_search":
                try:
                    arguments = json.loads(tool_call["function"]["arguments"])
                    query = arguments.get("query")
                    result = perform_web_search(query)
                except json.JSONDecodeError:
                    result = "Error: Invalid arguments for web_search."
            else:
                result = f"Error: Unknown tool '{tool_name}'."

            # The tool's result is added to the history.
            tool_response = {"role": "tool", "tool_call_id": tool_call["id"], "name": tool_name, "content": result}
            conversation_history.append(tool_response)

        # --- 4. Send the tool results back to the agent for a final answer ---
        print("\nSending search results back to agent...", file=sys.stderr)
        get_agent_response(PROMPT_ENDPOINT, conversation_history)

def main():
    """Main chat loop."""
    try:
        print("Connecting to agent for introduction...")
        print("\nAgent: ", end="")
        get_agent_response(START_ENDPOINT, [])
        print("\n")

        print("Chat session started. Type 'exit' or 'quit' to end.")
        conversation_history = []

        while True:
            user_input = input("\nYou: ")
            if user_input.lower() in ["exit", "quit"]:
                break
            
            conversation_history.append({"role": "user", "content": user_input})
            
            print("Agent: ", end="")
            get_agent_response(PROMPT_ENDPOINT, conversation_history)

    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        print("\n\nChat session ended.")

if __name__ == "__main__":
    # Check for dependencies.
    try:
        import requests
    except ImportError:
        print("The 'requests' library is required. Please install it by running:", file=sys.stderr)
        print("pip install requests", file=sys.stderr)
        sys.exit(1)
        
    main() 