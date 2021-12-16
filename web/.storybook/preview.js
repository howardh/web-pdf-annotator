import 'stories/storybook.scss';
import { addDecorator } from "@storybook/react";
import { MemoryRouter } from "react-router";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

// Wrap everything in a router for elements that use the router
addDecorator(story => <MemoryRouter initialEntries={['/']}>{story()}</MemoryRouter>);
