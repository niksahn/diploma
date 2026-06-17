import csv
import json
from pathlib import Path

from allpairspy import AllPairs


BASE_DIR = Path(__file__).resolve().parent
INPUT_PATH = BASE_DIR / "task_create_allpairspy_input.json"
OUTPUT_PATH = BASE_DIR / "task_create_pairwise_generated.csv"


def printable(value: str) -> str:
    if value == "":
        return "<EMPTY>"
    if value.isspace():
        return "<SPACES>"
    return value


def resolve_value(value: str) -> str:
    if value == "__REPEAT_T_101__":
        return "T" * 101
    if value == "__REPEAT_D_501__":
        return "D" * 501
    return value


def main() -> None:
    data = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    parameter_names = list(data.keys())
    value_lists = [[item["id"] for item in data[name]] for name in parameter_names]
    value_map = {
        name: {item["id"]: resolve_value(item["value"]) for item in items}
        for name, items in data.items()
    }

    rows = list(AllPairs(value_lists))

    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.writer(output_file)
        writer.writerow(
            [
                "case_id",
                "title_class",
                "title_value",
                "description_class",
                "description_value",
                "status_class",
                "status_value",
            ]
        )

        for index, row in enumerate(rows, start=1):
            resolved = {
                name: value_map[name][case_id]
                for name, case_id in zip(parameter_names, row, strict=True)
            }
            writer.writerow(
                [
                    index,
                    row[0],
                    printable(resolved["title"]),
                    row[1],
                    printable(resolved["description"]),
                    row[2],
                    printable(resolved["status"]),
                ]
            )

    print(f"Generated {len(rows)} pairwise test cases into {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
