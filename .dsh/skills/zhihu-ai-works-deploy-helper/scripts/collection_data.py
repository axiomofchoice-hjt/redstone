#!/usr/bin/env python3
"""Bounded, local AI Works collection state and allowlisted archive exports.

Semantic classification belongs to the host Agent. This module never reads chats,
executes project code, or uploads data.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import tempfile
import time
import uuid

MAX_RECORDS = 20
MAX_QUERIES = 5
MAX_TOTAL_QUERIES = 50
MAX_FILE_BYTES = 65_536
MAX_STATE_BYTES = 524_288
PATHS = {"seo": "_tmp/seo.intent.json", "blockers": "_tmp/deploy.remediation.json"}
INTENT_KEYS = {"intent_id", "intent", "queries", "first_observed_at_ms", "last_observed_at_ms"}
RECORD_KEYS = {"record_id", "error_code", "error_message", "reason", "occurred_at_ms"}
SENSITIVE = re.compile(
    r"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/=-]{8,}"
    r"|\b(?:password|secret|api[_-]?key|access[_-]?token|authorization)\s*[:=]\s*[\"']?(?!\[REDACTED\])[^\s\"']{4,}",
    re.IGNORECASE,
)


class CollectionError(ValueError):
    pass


def timestamp(value: object) -> int:
    if type(value) is not int or not 0 < value <= 2**63 - 1:
        raise CollectionError("timestamp must be a positive int64 millisecond value")
    return value


def now_ms() -> int:
    return time.time_ns() // 1_000_000


def identifier(value: object) -> str:
    if not isinstance(value, str):
        raise CollectionError("record identifier must be a canonical UUID")
    try:
        if str(uuid.UUID(value)) != value:
            raise ValueError()
    except ValueError as error:
        raise CollectionError("record identifier must be a canonical UUID") from error
    return value


def summary(value: object, limit: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.encode("utf-8")) > limit:
        raise CollectionError(f"summary must be nonempty and at most {limit} UTF-8 bytes")
    if SENSITIVE.search(value):
        raise CollectionError("possible credential content: provide a redacted factual summary")
    return value.strip()


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def no_duplicate_keys(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise CollectionError("duplicate JSON key")
        result[key] = value
    return result


def read_json(path: Path, limit: int = MAX_STATE_BYTES) -> object:
    with path.open("rb") as handle:
        data = handle.read(limit + 1)
    if len(data) > limit:
        raise CollectionError("collection JSON exceeds byte limit")
    try:
        return json.loads(data.decode("utf-8"), object_pairs_hook=no_duplicate_keys)
    except (UnicodeError, json.JSONDecodeError) as error:
        raise CollectionError("invalid collection JSON") from error


def checked_project_path(root: Path, relative: str) -> Path:
    path = root / relative
    for part in (path, *path.parents):
        if part.is_symlink():
            raise CollectionError("collection path must not contain symlinks")
    if path.exists() and not path.is_file():
        raise CollectionError("collection file must be a regular file")
    return path


def state_path(root: Path, supplied: Path | None = None) -> Path:
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise CollectionError("project root must be a directory")
    path = checked_project_path(root, "_tmp/.aiworks-collection/state.json")
    if supplied is not None and Path(os.path.abspath(supplied)) != path:
        raise CollectionError("collection metadata must use project _tmp/.aiworks-collection/state.json; external state directories are no longer supported")
    return path


def new_state(root: Path) -> dict:
    return {"state_version": 1, "project_root": str(root), "collection_id": str(uuid.uuid4()),
            "seo": {"intents": []}, "blockers": {"records": [], "active_detector": [], "active_manual": []}}


def load_state(path: Path, root: Path) -> dict:
    # Public project files are authoritative. Private metadata only retains query
    # observation times, continuous-blocker identities and collection failures.
    state = new_state(root)
    if path.exists():
        cached = read_json(path)
        if not isinstance(cached, dict) or cached.get("state_version") != 1:
            raise CollectionError("invalid collection metadata")
        state.update(cached)
    state["project_root"] = str(root)
    header_loaded = False
    for kind, relative in PATHS.items():
        prior = state.get(kind) if isinstance(state.get(kind), dict) else {}
        empty = new_state(root)[kind]
        try:
            public = checked_project_path(root, relative)
            if not public.exists():
                state[kind] = empty
                if prior.get("error"):
                    state[kind]["error"] = prior["error"]
                continue
            payload = read_json(public, MAX_FILE_BYTES)
            source = "intents" if kind == "seo" else "records"
            if not isinstance(payload, dict) or set(payload) != {"schema_version", "collection_id", "project_name", source} or type(payload["schema_version"]) is not int or payload["schema_version"] != 1:
                raise CollectionError("invalid project collection file")
            identifier(payload["collection_id"])
            summary(payload["project_name"], 255)
            if not header_loaded:
                state["collection_id"] = payload["collection_id"]
                header_loaded = True
            section = deepcopy(empty)
            section[source] = deepcopy(payload[source])
            if kind == "seo" and isinstance(section[source], list):
                previous = {item.get("intent_id"): item for item in prior.get("intents", []) if isinstance(item, dict)} if isinstance(prior.get("intents"), list) else {}
                for item in section[source]:
                    if not isinstance(item, dict) or set(item) != INTENT_KEYS:
                        raise CollectionError("invalid project intent fields")
                    times = previous.get(item["intent_id"], {}).get("query_observed_at", {})
                    if not isinstance(times, dict):
                        times = {}
                    item["query_observed_at"] = {q: times.get(q, item["last_observed_at_ms"]) for q in item["queries"]}
            elif kind == "blockers":
                for key in ("active_detector", "active_manual"):
                    section[key] = prior.get(key, [])
            if prior.get("error"):
                section["error"] = prior["error"]
            state[kind] = section
            validate_section(state, kind)
        except (OSError, ValueError, TypeError, KeyError) as error:
            state[kind] = {"error": "project collection file could not be read or validated"}
    return state


def section_payload(root: Path, state: dict, kind: str) -> bytes:
    section = validate_section(state, kind)
    if section.get("error"):
        raise CollectionError(section["error"])
    source, fields = ("intents", INTENT_KEYS) if kind == "seo" else ("records", RECORD_KEYS)
    payload = {"schema_version": 1, "collection_id": identifier(state["collection_id"]),
               "project_name": summary(root.name, 255),
               source: [{key: item[key] for key in fields} for item in section[source]]}
    data = encode(payload)
    if len(data) > MAX_FILE_BYTES:
        raise CollectionError("collection file exceeds 65536 bytes; provide shorter factual summaries")
    return data


def persist_project_files(root: Path, state: dict) -> None:
    for kind, relative in PATHS.items():
        try:
            data = section_payload(root, state, kind)
            public = checked_project_path(root, relative)
            write_atomic(public, json.loads(data))
        except (OSError, ValueError, TypeError, KeyError) as error:
            if not isinstance(state.get(kind), dict):
                state[kind] = {}
            state[kind]["error"] = str(error) if isinstance(error, CollectionError) else "project collection file could not be written"


def write_atomic(path: Path, state: dict) -> None:
    data = encode(state)
    if len(data) > MAX_STATE_BYTES:
        raise CollectionError("collection state exceeds byte limit")
    fd, name = tempfile.mkstemp(prefix=".state-", suffix=".tmp", dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def locked_state(root: Path, supplied: Path | None = None):
    root = root.resolve(strict=True)
    path = state_path(root, supplied)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock = path.parent / f".{path.name}.lock"
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as error:
        raise CollectionError("collection state is locked; retry after the other writer finishes") from error
    try:
        os.close(fd)
        state = load_state(path, root)
        yield state
        persist_project_files(root, state)
        metadata = {"state_version": 1, "collection_id": state["collection_id"],
                    "seo": {}, "blockers": {}}
        if isinstance(state.get("seo"), dict):
            items = state["seo"].get("intents", [])
            metadata["seo"]["intents"] = [{"intent_id": item["intent_id"], "query_observed_at": item["query_observed_at"]}
                                          for item in items if isinstance(item, dict) and "intent_id" in item and "query_observed_at" in item] if isinstance(items, list) else []
        if isinstance(state.get("blockers"), dict):
            for key in ("active_detector", "active_manual"):
                metadata["blockers"][key] = state["blockers"].get(key, [])
        for kind in PATHS:
            if isinstance(state.get(kind), dict) and state[kind].get("error"):
                metadata[kind]["error"] = state[kind]["error"]
        write_atomic(path, metadata)
    finally:
        lock.unlink(missing_ok=True)


def validate_section(state: dict, kind: str) -> dict:
    section = state.get(kind)
    if not isinstance(section, dict):
        raise CollectionError("invalid collection section")
    if kind == "seo":
        items = section.get("intents")
        id_key, keys = "intent_id", INTENT_KEYS | {"query_observed_at"}
    else:
        items = section.get("records")
        id_key, keys = "record_id", RECORD_KEYS
        for key in ("active_detector", "active_manual"):
            active = section.get(key)
            if not isinstance(active, list) or any(not isinstance(v, str) or not re.fullmatch(r"[a-f0-9]{64}", v) for v in active):
                raise CollectionError("invalid active blocker identities")
    if not isinstance(items, list) or len(items) > MAX_RECORDS:
        raise CollectionError("invalid collection records or record limit")
    ids, query_count = set(), 0
    for item in items:
        if not isinstance(item, dict) or set(item) != keys:
            raise CollectionError("invalid collection record fields")
        ident = identifier(item.get(id_key))
        if ident in ids:
            raise CollectionError("duplicate collection record identifier")
        ids.add(ident)
        if kind == "seo":
            summary(item["intent"], 512)
            first = timestamp(item["first_observed_at_ms"])
            last = timestamp(item["last_observed_at_ms"])
            if first > last:
                raise CollectionError("first observation must not follow last observation")
            queries, times = item["queries"], item["query_observed_at"]
            if not isinstance(queries, list) or len(queries) > MAX_QUERIES or not isinstance(times, dict):
                raise CollectionError("invalid queries")
            normalized = [summary(query, 512) for query in queries]
            if normalized != queries or len(set(queries)) != len(queries) or set(times) != set(queries):
                raise CollectionError("queries must be normalized and unique")
            for at in times.values():
                timestamp(at)
            query_count += len(queries)
        else:
            summary(item["error_code"], 128)
            summary(item["error_message"], 2048)
            summary(item["reason"], 2048)
            timestamp(item["occurred_at_ms"])
    if query_count > MAX_TOTAL_QUERIES:
        raise CollectionError("total query limit exceeded")
    return section


def trim_seo(section: dict) -> None:
    intents = section["intents"]
    intents.sort(key=lambda item: (item["last_observed_at_ms"], item["intent_id"]), reverse=True)
    del intents[MAX_RECORDS:]
    all_queries = []
    for item in intents:
        times = item["query_observed_at"]
        keep = sorted(times, key=lambda q: (times[q], q), reverse=True)[:MAX_QUERIES]
        item["query_observed_at"] = {q: times[q] for q in keep}
        all_queries.extend((times[q], item["intent_id"], q) for q in keep)
    keep_all = {(ident, q) for _, ident, q in sorted(all_queries, reverse=True)[:MAX_TOTAL_QUERIES]}
    for item in intents:
        item["query_observed_at"] = {q: at for q, at in item["query_observed_at"].items() if (item["intent_id"], q) in keep_all}
        item["queries"] = list(item["query_observed_at"])


def upsert_intent(state: dict, intent: str, queries: list[str], intent_id: str | None = None, at: int | None = None) -> str:
    section = validate_section(state, "seo")
    at = timestamp(now_ms() if at is None else at)
    intent = summary(intent, 512)
    queries = list(dict.fromkeys(summary(query, 512) for query in queries))
    if intent_id:
        identifier(intent_id)
        item = next((i for i in section["intents"] if i["intent_id"] == intent_id), None)
        if item is None:
            raise CollectionError("intent_id is not in current project state; inspect before merging")
    else:
        item = {"intent_id": str(uuid.uuid4()), "intent": intent, "queries": [], "query_observed_at": {},
                "first_observed_at_ms": at, "last_observed_at_ms": at}
        section["intents"].append(item)
    item["intent"] = intent
    item["last_observed_at_ms"] = max(item["last_observed_at_ms"], at)
    for query in queries:
        item["query_observed_at"][query] = max(item["query_observed_at"].get(query, at), at)
    trim_seo(section)
    section.pop("error", None)
    return item["intent_id"]


def fingerprint(parts: object) -> str:
    return hashlib.sha256(encode(parts)).hexdigest()


def append_blocker(section: dict, code: str, message: str, reason: str, at: int) -> str:
    record = {"record_id": str(uuid.uuid4()), "error_code": summary(code, 128),
              "error_message": summary(message, 2048), "reason": summary(reason, 2048), "occurred_at_ms": timestamp(at)}
    section["records"].append(record)
    section["records"].sort(key=lambda item: (item["occurred_at_ms"], item["record_id"]), reverse=True)
    del section["records"][MAX_RECORDS:]
    return record["record_id"]


def snapshot_blockers(state: dict, findings: list[dict], at: int | None = None) -> None:
    section = validate_section(state, "blockers")
    at = timestamp(now_ms() if at is None else at)
    if not isinstance(findings, list):
        raise CollectionError("Findings must be an array")
    active = set()
    for finding in findings:
        if not isinstance(finding, dict):
            raise CollectionError("invalid finding")
        if finding.get("Severity") != "error":
            continue
        evidence = finding.get("Evidence")
        if not isinstance(evidence, list) or any(not isinstance(p, str) for p in evidence):
            raise CollectionError("invalid finding evidence")
        for path in evidence:
            if PurePosixPath(path).is_absolute() or ".." in PurePosixPath(path).parts:
                raise CollectionError("finding evidence must be root relative")
        code = summary(finding.get("Code"), 128)
        reason = summary(finding.get("Reason"), 2048)
        key = fingerprint([code, finding.get("Unit"), sorted(set(evidence))])
        if key not in section["active_detector"] and key not in active:
            append_blocker(section, code, reason, reason, at)
        active.add(key)
    section["active_detector"] = sorted(active)
    section.pop("error", None)


def record_blocker(state: dict, key: str, code: str, message: str, reason: str, at: int | None = None) -> str | None:
    section = validate_section(state, "blockers")
    key = fingerprint(summary(key, 512))
    if key in section["active_manual"]:
        return None
    ident = append_blocker(section, code, message, reason, now_ms() if at is None else at)
    section["active_manual"].append(key)
    section.pop("error", None)
    return ident


def warning(kind: str, error: Exception) -> dict:
    # Do not reflect untrusted text, filesystem contents, or command output.
    return {"code": "W_COLLECTION_SKIPPED", "kind": kind, "reason": str(error) if isinstance(error, CollectionError) else "collection state could not be read or written"}


def update(root: Path, kind: str, operation, supplied: Path | None = None):
    failure = None
    with locked_state(root, supplied) as state:
        original = deepcopy(state.get(kind))
        try:
            result = operation(state)
            section_payload(root.resolve(), state, kind)
        except (OSError, ValueError, TypeError, KeyError) as error:
            state[kind] = original
            # Preserve the other section. Persist failure instead of exporting stale
            # data as though this observation was successfully collected.
            if isinstance(state.get(kind), dict):
                state[kind]["error"] = "collection observation failed; inspect state and retry"
            else:
                state[kind] = {"error": "invalid collection section"}
            failure = error
    if failure is not None:
        raise failure
    if state[kind].get("error"):
        raise CollectionError(state[kind]["error"])
    return result


def collect_snapshot(root: Path, findings: list[dict], supplied: Path | None = None) -> list[dict]:
    try:
        update(root, "blockers", lambda state: snapshot_blockers(state, findings), supplied)
        return []
    except (OSError, ValueError, TypeError, KeyError) as error:
        return [warning("blockers", error)]


def export_entries(root: Path, supplied: Path | None = None) -> tuple[dict[str, bytes], list[dict]]:
    entries, warnings = {}, []
    try:
        root = root.resolve(strict=True)
        with locked_state(root, supplied) as state:
            # begin/export also materializes the two empty files for a new project.
            persist_project_files(root, state)
            for kind, relative in PATHS.items():
                try:
                    section_payload(root, state, kind)
                    entries[relative] = checked_project_path(root, relative).read_bytes()
                except (OSError, ValueError, TypeError, KeyError) as error:
                    warnings.append(warning(kind, error))
    except (OSError, ValueError, TypeError, KeyError) as error:
        return {}, [warning(kind, error) for kind in PATHS]
    return entries, warnings


def input_record(path: Path, root: Path, supplied: Path | None, allowed: set[str]) -> dict:
    location = state_path(root, supplied).parent
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        if part.is_symlink():
            raise CollectionError("input path must not contain symlinks")
    if location not in path.parents or path == location / "state.json":
        raise CollectionError("input JSON must be inside project _tmp/.aiworks-collection input directory")
    if not path.is_file():
        raise CollectionError("input must be a regular JSON file")
    value = read_json(path, MAX_FILE_BYTES)
    if not isinstance(value, dict) or set(value) - allowed:
        raise CollectionError("input contains unsupported fields")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", required=True, type=Path)
    parser.add_argument("--state-dir", type=Path)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("begin")
    commands.add_parser("status")
    commands.add_parser("export")
    observe = commands.add_parser("observe-seo")
    observe.add_argument("--input", required=True, type=Path)
    snapshot = commands.add_parser("snapshot-blockers")
    snapshot.add_argument("--plan", type=Path, required=True)
    blocker = commands.add_parser("record-blocker")
    blocker.add_argument("--input", required=True, type=Path)
    clear = commands.add_parser("clear-blocker")
    clear.add_argument("--key", required=True)
    args = parser.parse_args()
    supplied = args.state_dir / "state.json" if args.state_dir else None
    kind = "seo" if args.command == "observe-seo" else "blockers"
    try:
        if args.command in {"begin", "status", "export"}:
            entries, warnings = export_entries(args.project_root, supplied)
            report = {"state_dir": str(state_path(args.project_root, supplied).parent),
                      "files": {key: json.loads(data) for key, data in entries.items()}, "warnings": warnings}
            print(json.dumps(report, ensure_ascii=False))
            return 1 if warnings else 0
        def operation(state):
            if args.command == "observe-seo":
                value = input_record(args.input, args.project_root, supplied,
                                     {"intent_id", "intent", "queries", "observed_at_ms"})
                queries = value.get("queries", [])
                if not isinstance(queries, list):
                    raise CollectionError("queries must be an array")
                return upsert_intent(state, value.get("intent"), queries, value.get("intent_id"), value.get("observed_at_ms"))
            if args.command == "snapshot-blockers":
                plan = read_json(args.plan)
                if not isinstance(plan, dict):
                    raise CollectionError("plan must be a JSON object")
                return snapshot_blockers(state, plan["Findings"])
            if args.command == "record-blocker":
                value = input_record(args.input, args.project_root, supplied,
                                     {"key", "error_code", "error_message", "reason", "occurred_at_ms"})
                return record_blocker(state, value.get("key"), value.get("error_code"), value.get("error_message"),
                                      value.get("reason"), value.get("occurred_at_ms"))
            section = validate_section(state, "blockers")
            key = fingerprint(summary(args.key, 512))
            section["active_manual"] = [value for value in section["active_manual"] if value != key]
            return None
        ident = update(args.project_root, kind, operation, supplied)
        print(json.dumps({"status": "recorded", "id": ident}, ensure_ascii=False))
        return 0
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(json.dumps({"warnings": [warning(kind, error)]}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
