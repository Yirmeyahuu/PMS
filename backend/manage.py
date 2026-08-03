#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def set_macos_library_path():
    """Fix WeasyPrint (and other CFFI libraries) failing to load Homebrew dependencies on Apple Silicon."""
    if sys.platform == 'darwin':
        homebrew_lib = '/opt/homebrew/lib'
        if homebrew_lib not in os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', ''):
            os.environ['DYLD_FALLBACK_LIBRARY_PATH'] = f"{homebrew_lib}:{os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', '')}"


def main():
    """Run administrative tasks."""
    set_macos_library_path()
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
