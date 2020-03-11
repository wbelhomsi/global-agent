// @flow

import {
  createGlobalProxyAgent,
} from '../factories';

export default (configurationInput) => {
  if (global.GLOBAL_AGENT) {
    return false;
  }

  global.GLOBAL_AGENT = createGlobalProxyAgent(configurationInput);

  return true;
};
