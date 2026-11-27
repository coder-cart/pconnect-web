'use client';

import { useMemo } from 'react';
import { Select } from '@/components/ui/Select';
import { getBrowserTimeZone } from '@/lib/formatMessageDate';
import { formatTimeZoneLabel, listTimeZoneOptions } from '@/lib/timezones';

interface TimeZoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  /**
   * When true, first option clears the preference (device / org default).
   * Use on account profile. Client/campaign forms usually keep a concrete zone.
   */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Include the current device zone at the top of the concrete list. */
  preferDeviceZone?: boolean;
}

export function TimeZoneSelect({
  value,
  onChange,
  label = 'Time zone',
  name = 'timeZone',
  disabled = false,
  className,
  error,
  allowEmpty = false,
  emptyLabel,
  preferDeviceZone = true,
}: TimeZoneSelectProps) {
  const deviceTimeZone = useMemo(() => getBrowserTimeZone(), []);

  const options = useMemo(() => {
    const zones = listTimeZoneOptions();
    const ordered = preferDeviceZone
      ? [
          deviceTimeZone,
          ...zones.filter((zone) => zone !== deviceTimeZone),
        ]
      : zones;

    const mapped = ordered.map((zone) => ({
      value: zone,
      label: formatTimeZoneLabel(zone),
    }));

    // Keep a saved custom/legacy value selectable even if missing from the list.
    if (value && !mapped.some((option) => option.value === value)) {
      mapped.unshift({
        value,
        label: formatTimeZoneLabel(value),
      });
    }

    if (allowEmpty) {
      return [
        {
          value: '',
          label:
            emptyLabel ??
            `Use device timezone (${formatTimeZoneLabel(deviceTimeZone)})`,
        },
        ...mapped,
      ];
    }

    return mapped;
  }, [allowEmpty, deviceTimeZone, emptyLabel, preferDeviceZone, value]);

  return (
    <Select
      label={label}
      name={name}
      value={value}
      disabled={disabled}
      className={className}
      error={error}
      options={options}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
