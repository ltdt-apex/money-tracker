import Select, { type GroupBase, type StylesConfig } from "react-select";
import type { Categories } from "../api";

interface Option {
  value: string;
  label: string;
}

interface GroupedOption extends GroupBase<Option> {
  label: string;
  options: Option[];
}

interface Props {
  categories: Categories;
  value: string;
  onChange: (subcategory: string) => void;
}

function buildOptions(categories: Categories): GroupedOption[] {
  return Object.entries(categories).map(([catName, catData]) => ({
    label: `${catData.emoji} ${catName}`,
    options: Object.entries(catData.subcategories).map(([subName, subEmoji]) => ({
      value: subName,
      label: `${subEmoji} ${subName}`,
    })),
  }));
}

const styles: StylesConfig<Option, false, GroupedOption> = {
  control: (base, state) => ({
    ...base,
    borderRadius: 8,
    border: `1.5px solid ${state.isFocused ? "#4f46e5" : "#e0e0e0"}`,
    boxShadow: state.isFocused ? "0 0 0 3px rgba(79, 70, 229, 0.1)" : "none",
    fontSize: "0.95rem",
    minHeight: "unset",
    "&:hover": { borderColor: state.isFocused ? "#4f46e5" : "#c0c0c0" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0.375rem 0.875rem",
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#9ca3af",
  }),
  groupHeading: (base) => ({
    ...base,
    fontWeight: 700,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    color: "#6b7280",
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: 240,
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.9rem",
    paddingLeft: "1.25rem",
    backgroundColor: state.isSelected ? "#e0e7ff" : state.isFocused ? "#eef2ff" : "white",
    color: "#1a1a2e",
    fontWeight: state.isSelected ? 600 : 400,
    cursor: "pointer",
    "&:active": { backgroundColor: "#e0e7ff" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
};

export default function CategoryPicker({ categories, value, onChange }: Props) {
  const grouped = buildOptions(categories);

  // Find the selected option
  let selected: Option | null = null;
  if (value) {
    for (const group of grouped) {
      const found = group.options.find((o) => o.value === value);
      if (found) {
        selected = found;
        break;
      }
    }
  }

  return (
    <Select<Option, false, GroupedOption>
      options={grouped}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? "")}
      placeholder="Select category"
      isClearable
      isSearchable
      styles={styles}
      noOptionsMessage={() => "No matches"}
    />
  );
}
