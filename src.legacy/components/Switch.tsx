import Switch from '@mui/material/Switch'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}

export function SwitchToggle({ checked, onChange, label }: Props) {
  return (
    <Switch
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      slotProps={{ input: { 'aria-label': label } }}
    />
  )
}
