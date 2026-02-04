import type { Profile } from "@oh-my-git/shared";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import { useState } from "react";

export interface AppProps {
  profiles: Profile[];
  repoPath: string;
  onSelect: (profile: Profile) => Promise<void>;
}

type Item = { label: string; value: Profile };

export function App({ profiles, repoPath, onSelect }: AppProps) {
  const { exit } = useApp();
  const [message, setMessage] = useState<string>("");
  const items: Item[] = profiles.map((profile) => ({
    label: `${profile.label} (${profile.git.email})`,
    value: profile,
  }));

  if (profiles.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No profiles found.</Text>
        <Text>Create one with `omg profile add`.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>Oh My Git</Text>
      <Text dimColor>Apply a profile to: {repoPath}</Text>
      <Text> </Text>
      <SelectInput
        items={items}
        onSelect={(item) => {
          setMessage(`Applying ${item.value.id}...`);
          void onSelect(item.value)
            .then(() => {
              setMessage(`Applied ${item.value.id}.`);
              exit();
            })
            .catch((error) => {
              setMessage(error?.message || String(error));
            });
        }}
      />
      {message ? <Text>{message}</Text> : null}
    </Box>
  );
}
