#!/bin/bash

# A simple, interactive chat client for your personal agent.

# --- Configuration ---
AGENT_URL="http://localhost:80"
START_ENDPOINT="$AGENT_URL/start"
PROMPT_ENDPOINT="$AGENT_URL/prompt"

# --- Session Management ---
# Create a temporary file to store cookies for session management.
# The 'trap' command ensures this file is deleted when the script exits.
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

# --- Helper Function ---
# This function handles the streaming and formatting of the AI's response.
function get_response() {
    # The -s flag makes curl silent (no progress meter).
    # --cookie and --cookie-jar handle session cookies.
    # The pipeline of grep, sed, jq, and awk processes the raw SSE stream.
    # The final 'echo ""' ensures the command prompt appears on a new line.
    curl -s --location --cookie "$COOKIE_JAR" --cookie-jar "$COOKIE_JAR" "$1" --request POST --header 'Content-Type: application/json' --data "$2" | \
        grep '^data: ' | \
        sed 's/^data: //' | \
        jq -r 'if .choices and .choices[0].delta.content then .choices[0].delta.content else empty end' | \
        awk '{printf "%s", $0}'; echo ""
}

# --- Main Script ---

echo "Connecting to agent for introduction..."
echo ""
printf "Agent: "
get_response "$START_ENDPOINT" "" # Call the start endpoint for the greeting
echo ""
echo ""

echo "Chat session started. Type 'exit' or 'quit' to end."
echo ""

# Loop indefinitely to create a chat session
while true; do
    # Prompt the user for input
    read -p "You: " user_input

    # Check for exit command
    if [[ "$user_input" == "exit" || "$user_input" == "quit" ]]; then
        break
    fi

    # Safely create the JSON payload using jq to handle special characters
    json_payload=$(jq -n --arg content "$user_input" '{"messages":[{"role":"user", "content":$content}]}')

    # Get and print the agent's response
    printf "Agent: "
    get_response "$PROMPT_ENDPOINT" "$json_payload"
    echo "" # Add a blank line for readability
done

echo ""
echo "Chat session ended." 