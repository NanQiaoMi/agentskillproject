import sys
import subprocess

def run():
    try:
        out = subprocess.check_output(['python', '.agentflow/agentflow.py', 'json-list'], cwd=r'd:\agentcode')
        print(repr(out))
    except Exception as e:
        print('ERROR:', e)

run()
