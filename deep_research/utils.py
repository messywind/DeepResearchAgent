#***********************************************
#      Filename: utils.py
#   Description: 工具函数库
#***********************************************

import os
import yaml
from pathlib import Path
from datetime import datetime


# ===== UTILITY FUNCTIONS =====

def get_today_str() -> str:
    """获取今天的日期并返回格式化的字符串"""
    return datetime.now().strftime("%a %b %-d, %Y")

def get_current_dir() -> Path:
    """获取当前的目录"""
    try:
        return Path(__file__).resolve().parent
    except NameError:
        return Path.cwd()


# ===== CONFIG LOADER =====


def resolve_config_path(config_path=None):
    """解析配置文件路径。

    显式传入的路径和 CONFIG_PATH 环境变量优先；否则优先使用未纳入版本控制的
    config.local.yml，便于本地保存 API Key。没有本地配置时回退到模板 config.yml。
    """
    if config_path:
        return str(config_path)

    env_path = os.environ.get("CONFIG_PATH")
    if env_path:
        return env_path

    local_path = Path("config.local.yml")
    if local_path.is_file():
        return str(local_path)

    return "config.yml"


def get_config_yml(path, section_name, subsection_name=None):
    """读取yaml文件"""
    if not os.path.isfile(path):
        raise FileNotFoundError(f"No such file: {path}")

    with open(path, encoding="utf8") as f:
        data = yaml.safe_load(f)
        try:
            return (
                data[section_name]
                if subsection_name is None
                else data[section_name][subsection_name]
            )
        except KeyError as e:
            raise KeyError(
                f"No such section or subsection in config file: {section_name}, {subsection_name}. Config file: {path}"
            ) from e


def load_config(stage_name=None, config_path=None):
    """加载配置"""
    config_path = resolve_config_path(config_path)
    return get_config_yml(
        path=config_path, section_name="stages", subsection_name=stage_name
    )
