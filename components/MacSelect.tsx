import { createListCollection, Select } from "@ark-ui/solid/select";
import { Portal } from "@solidjs/web";
import { ChevronDown } from "lucide-solid";
import { Index } from "@/compat/solid-js";

interface SelectOption {
  value: string;
  label: string;
}

interface MacSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  class?: string;
}

export function MacSelect(props: MacSelectProps) {
  const collection = () =>
    createListCollection({
      items: props.options,
      itemToValue: (item) => item.value,
      itemToString: (item) => item.label,
    });

  return (
    <Select.Root
      collection={collection()}
      value={props.value ? [props.value] : []}
      onValueChange={(e) => {
        const next = e.value[0];
        if (next !== undefined) props.onChange?.(next);
      }}
      class={props.class}
    >
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={props.placeholder ?? "Select..."} />
          <Select.Indicator>
            <ChevronDown class="w-4 h-4" />
          </Select.Indicator>
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            <Index each={collection().items}>
              {(item) => (
                <Select.Item item={item()}>
                  <Select.ItemText>{item().label}</Select.ItemText>
                  <Select.ItemIndicator>✓</Select.ItemIndicator>
                </Select.Item>
              )}
            </Index>
          </Select.Content>
        </Select.Positioner>
      </Portal>
      <Select.HiddenSelect />
    </Select.Root>
  );
}
