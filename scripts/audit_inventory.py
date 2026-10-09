"""Rebuild the repository inventory without importing the app or touching its database."""
import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def inventory():
    routes, models, tests = [], [], []
    for path in sorted((ROOT / "backend").rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8-sig"))
        name = path.relative_to(ROOT).as_posix()
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if node.name.startswith("test_"):
                    tests.append(f"{name}::{node.name}")
                for decorator in node.decorator_list:
                    if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute):
                        method = decorator.func.attr
                        if method in {"get", "post", "put", "patch", "delete", "websocket"} and decorator.args:
                            routes.append({"file": name, "method": method.upper(), "path": ast.literal_eval(decorator.args[0])})
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "__tablename__" for t in item.targets):
                        models.append({"file": name, "model": node.name, "table": ast.literal_eval(item.value)})
    return {"routes_relative_to_router_prefix": routes, "models": models, "backend_tests": tests,
            "frontend_pages": [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / "frontend/src/pages").glob("*/index.tsx"))],
            "frontend_tests": [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / "frontend/src/test").glob("*.test.*"))]}


if __name__ == "__main__":
    result = inventory()
    destination = ROOT / "docs/repository-inventory.json"
    destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: len(value) for key, value in result.items()}))
