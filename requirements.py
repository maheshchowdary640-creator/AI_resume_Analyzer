import os
import subprocess
import sys

def main():
    print("Setting up virtual environment...")
    venv_dir = os.path.join(os.getcwd(), ".venv")
    
    if not os.path.exists(venv_dir):
        print("Creating virtual environment in .venv...")
        try:
            subprocess.run([sys.executable, "-m", "venv", ".venv"], check=True)
            print("Virtual environment created successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Error creating virtual environment: {e}")
            sys.exit(1)
    else:
        print("Virtual environment already exists.")
        
    pip_path = os.path.join(venv_dir, "Scripts", "pip.exe")
    if not os.path.exists(pip_path):
        # Fallback for other systems
        pip_path = os.path.join(venv_dir, "bin", "pip")
        
    if not os.path.exists(pip_path):
        print(f"Could not find pip executable at {pip_path}")
        sys.exit(1)
        
    print("Installing dependencies from requirements.txt...")
    try:
        subprocess.run([pip_path, "install", "-r", "requirements.txt"], check=True)
        print("All dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
