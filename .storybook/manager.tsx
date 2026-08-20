import { BookIcon } from "@storybook/icons";
// biome-ignore lint/correctness/noUnusedImports: Storybook's manager builder compiles JSX with the classic runtime, so React must be in scope
import React from "react";
import { Button } from "storybook/internal/components";
import { addons, types } from "storybook/manager-api";

const DOCS_URL = "https://logo-soup.sanity.dev/docs/introduction";

addons.register("logo-soup/docs-link", () => {
  addons.add("logo-soup/docs-link/toolbar", {
    type: types.TOOL,
    title: "Documentation",
    render: () => (
      <Button
        as="a"
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        variant="ghost"
        ariaLabel={false}
      >
        <BookIcon />
        Docs
      </Button>
    ),
  });
});
