import requests
import json
import time

BASE = "http://localhost:47334/api/sql/query"

def run_sql(query):
    r = requests.post(BASE, json={"query": query})
    result = r.json()
    print(f"Type: {result.get('type')}")
    if result.get('type') == 'error':
        print(f"Error: {result.get('error_message','')[:300]}")
    elif result.get('data'):
        for row in result['data'][:5]:
            print(row)
    print("---")
    return result

# Check model status first
print("=== Model Status ===")
run_sql("SELECT name, status, error FROM models")

# Create an AI Agent
print("=== Creating AI Agent ===")
run_sql("""
CREATE AGENT gemini_agent
USING
    model = 'gemini_pro',
    skills = []
""")
time.sleep(3)

# Verify agent
print("=== Agents ===")
run_sql("SHOW AGENTS")
