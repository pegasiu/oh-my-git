import { Box, render, Text } from "ink";
import SelectInput from "ink-select-input";

type AccountItem = { label: string; value: string };

function AccountPicker({
  accounts,
  onSelect,
}: {
  accounts: string[];
  onSelect: (account: string) => void;
}) {
  const items: AccountItem[] = accounts.map((account) => ({ label: account, value: account }));
  return (
    <Box flexDirection="column" gap={1}>
      <Text>Select a GitHub account</Text>
      <SelectInput
        items={items}
        onSelect={(item) => {
          onSelect(item.value);
        }}
      />
    </Box>
  );
}

export async function selectGhAccount(accounts: string[]): Promise<string> {
  if (accounts.length === 1) return accounts[0];
  return new Promise((resolve) => {
    const { unmount } = render(
      <AccountPicker
        accounts={accounts}
        onSelect={(account) => {
          resolve(account);
          unmount();
        }}
      />,
    );
  });
}
