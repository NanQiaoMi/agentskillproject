import os
import shutil
import glob
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

def get_project_root():
    # The script is located in .agentflow, so its parent is the project root
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def sync_skills():
    project_root = get_project_root()
    dest_dir = os.path.join(project_root, ".agentflow", "skills")
    
    # Ensure destination directory exists
    os.makedirs(dest_dir, exist_ok=True)
    
    # Sources to search for skills
    # 1. Antigravity plugin skills
    gemini_plugins = r"C:\Users\Legion\.gemini\config\plugins\*\skills\*"
    # 2. Workspace global agents skills
    workspace_skills = r"d:\agentcode\.agents\skills\*"
    
    sources = [gemini_plugins, workspace_skills]
    
    copied_count = 0
    
    for source_pattern in sources:
        for skill_dir in glob.glob(source_pattern):
            if not os.path.isdir(skill_dir):
                continue
                
            # Must contain SKILL.md to be a valid skill
            skill_md = os.path.join(skill_dir, "SKILL.md")
            if not os.path.exists(skill_md):
                continue
                
            skill_name = os.path.basename(skill_dir)
            target_skill_dir = os.path.join(dest_dir, skill_name)
            
            # Copy or overwrite the skill directory
            try:
                if os.path.exists(target_skill_dir):
                    shutil.rmtree(target_skill_dir)
                shutil.copytree(skill_dir, target_skill_dir)
                logging.info(f"Imported skill: {skill_name}")
                copied_count += 1
            except Exception as e:
                logging.error(f"Failed to import skill {skill_name}: {e}")
                
    logging.info(f"Successfully imported {copied_count} skills into .agentflow/skills/")

if __name__ == "__main__":
    sync_skills()
