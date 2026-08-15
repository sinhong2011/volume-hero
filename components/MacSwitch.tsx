import { Switch } from "@ark-ui/solid/switch";
import type { JSX } from "@solidjs/web";

interface MacSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string | JSX.Element;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function MacSwitch(props: MacSwitchProps) {
  return (
    <Switch.Root
      checked={props.checked}
      onCheckedChange={(e) => props.onChange?.(e.checked)}
      disabled={props.disabled}
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      {props.label && <Switch.Label>{props.label}</Switch.Label>}
      <Switch.HiddenInput />
    </Switch.Root>
  );
}
