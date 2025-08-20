#!/usr/bin/env python3
"""
Test script to verify that the debug feature (inner workings) is working correctly.
This tests that the API returns the last_prompt field with the full prompt sent to the LLM.
"""

import json
import sys

import requests


def test_debug_feature():
    """Test that the chat API returns the last_prompt field"""

    # API endpoint
    base_url = "http://localhost:8000"
    chat_endpoint = f"{base_url}/api/chat"

    # Test message
    test_message = (
        "Hello, can you explain what artificial intelligence is in simple terms?"
    )

    print("=" * 60)
    print("Testing Debug Feature - Inner Workings")
    print("=" * 60)
    print()

    # Prepare the request
    payload = {
        "message": test_message,
        "session_id": None,  # Will create a new session
    }

    print(f"Sending message: {test_message}")
    print()

    try:
        # Send the request
        response = requests.post(
            chat_endpoint, json=payload, headers={"Content-Type": "application/json"}
        )

        # Check if request was successful
        if response.status_code != 200:
            print(f"❌ Error: API returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return False

        # Parse the response
        data = response.json()

        # Check if response has required fields
        required_fields = ["response", "session_id", "timestamp"]
        for field in required_fields:
            if field not in data:
                print(f"❌ Error: Missing required field '{field}' in response")
                return False

        print("✅ All required fields present in response")
        print()

        # Check if last_prompt field exists
        if "last_prompt" not in data:
            print("❌ Error: 'last_prompt' field is missing from response")
            print("The debug feature may not be properly implemented")
            return False

        print("✅ 'last_prompt' field found in response!")
        print()

        # Display the last prompt
        print("=" * 60)
        print("LAST PROMPT SENT TO LLM:")
        print("-" * 60)
        print(data["last_prompt"])
        print("=" * 60)
        print()

        # Verify the prompt contains expected elements
        last_prompt = data["last_prompt"]

        # Check for system prompt
        if "helpful" in last_prompt.lower() and "assistant" in last_prompt.lower():
            print("✅ System prompt detected in the full prompt")
        else:
            print("⚠️  Warning: System prompt may be missing")

        # Check for user message
        if test_message in last_prompt:
            print("✅ User message found in the full prompt")
        else:
            print("❌ Error: User message not found in the full prompt")
            return False

        # Check for conversation markers (specific to Gemma format)
        if "<start_of_turn>" in last_prompt:
            print("✅ Gemma conversation markers detected")
        else:
            print(
                "ℹ️  Note: Gemma conversation markers not found (model may use different format)"
            )

        print()
        print("=" * 60)
        print("TEST SUMMARY:")
        print("-" * 60)
        print("✅ Debug feature is working correctly!")
        print("✅ The API successfully returns the full prompt sent to the LLM")
        print("✅ This can be displayed in the 'Inner Workings' panel in the UI")
        print("=" * 60)

        # Also show the AI's response
        print()
        print("AI Response:")
        print("-" * 60)
        print(
            data["response"][:200] + "..."
            if len(data["response"]) > 200
            else data["response"]
        )
        print()

        return True

    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the server")
        print("Make sure the server is running on http://localhost:8000")
        print("Run: python server.py")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: Request failed - {e}")
        return False
    except json.JSONDecodeError:
        print("❌ Error: Invalid JSON response from server")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def main():
    """Main function"""
    print()
    print("This script tests the 'Inner Workings' debug feature")
    print("It verifies that the API returns the last prompt sent to the LLM")
    print()

    # Run the test
    success = test_debug_feature()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
