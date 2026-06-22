import os
import sys
import socket
import subprocess

def get_local_ip():
    try:
        # Create a dummy connection to get the active network adapter's local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def main():
    print("AI Resume Analyzer Launcher")
    print("--------------------------")
    
    # Path to the virtual environment Python executable
    venv_dir = os.path.join(os.getcwd(), ".venv")
    if os.name == 'nt':
        python_bin = os.path.join(venv_dir, "Scripts", "python.exe")
    else:
        python_bin = os.path.join(venv_dir, "bin", "python")
        
    if not os.path.exists(python_bin):
        print("Error: Virtual environment not found. Running requirements.py to set it up...")
        subprocess.run([sys.executable, "requirements.py"], check=True)
        
    if not os.path.exists(python_bin):
        print(f"Error: Could not find Python binary in virtual environment at {python_bin}")
        sys.exit(1)
        
    local_ip = get_local_ip()
    
    print("Starting FastAPI app...")
    print("\n[Computer Access] To access on this Computer, open:")
    print("   -> http://127.0.0.1:8000")
    
    if local_ip != "127.0.0.1":
        print("\n[Mobile Phone Access] To access on your Mobile Phone (must be on the same Wi-Fi network):")
        print(f"   -> http://{local_ip}:8000")
    print("------------------------------------------------------------------\n")
    
    try:
        # Run uvicorn inside the virtual environment listening on all interfaces (0.0.0.0)
        subprocess.run([python_bin, "-m", "uvicorn", "app:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\nStopping application server.")
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    main()
