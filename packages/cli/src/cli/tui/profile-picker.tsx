import type { Profile } from "@oh-my-git/shared";
import { Box, render, Text } from "ink";
import SelectInput from "ink-select-input";

type PickerItem = { label: string; value: Profile | null };

function ProfilePicker({
  profiles,
  onSelect,
}: {
  profiles: Profile[];
  onSelect: (profile: Profile | null) => void;
}) {
  const items: PickerItem[] = profiles.map((profile) => ({
    label: `${profile.label} (${profile.git.email})`,
    value: profile,
  }));
  items.push({ label: "Cancel", value: null });
  return (
    <Box flexDirection="column" gap={1}>
      <Text>Select a profile to use for cloning (or cancel)</Text>
      <SelectInput
        items={items}
        onSelect={(item) => {
          onSelect(item.value);
        }}
      />
    </Box>
  );
}

export async function selectProfile(profiles: Profile[]): Promise<Profile | null> {
  return new Promise((resolve) => {
    const { unmount } = render(
      <ProfilePicker
        profiles={profiles}
        onSelect={(profile) => {
          resolve(profile);
          unmount();
        }}
      />,
    );
  });
}
