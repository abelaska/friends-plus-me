const states = {
  profile: {
    enabled: {
      code: 0
    },
    blocked: {
      code: 1
    }
  },

  queue: {
    enabled: {
      code: 0
    },
    paused: {
      code: 1
    },
    blocked: {
      code: 2
    },
    reconnectRequired: {
      code: 3
    }
  },

  account: {
    enabled: {
      code: 0
    },
    disabled: {
      code: 1
    },
    blocked: {
      code: 2
    },
    reconnectRequired: {
      code: 3
    }
  },

  user: {
    deleted: {
      code: 0
    },
    enabled: {
      code: 1
    },
    blocked: {
      code: 2
    }
  },

  post: {
    scheduled: {
      code: -52
    },
    scheduledByScheduler: {
      code: -51
    },
    scheduledByUser: {
      code: -50
    },
    smallerIsScheduled: {
      code: -49
    },
    retry: {
      code: -2
    },
    publishing: {
      code: -1
    },
    draft: {
      code: 0
    },
    failed: {
      code: 1
    },
    published: {
      code: 100
    }
  },

  emailNotification: {
    failed: {
      code: -1
    },
    waiting: {
      code: 0
    },
    sent: {
      code: 100
    }
  }
};

function codeToName(code) {
  /* jshint validthis:true */
  return this[code] ? this[code].name : `unknown(${code})`;
}

let state;
for (const model in states) {
  for (const _name in states[model]) {
    state = states[model][_name];
    state.name = _name;
    states[model][state.code] = state;
  }
  state = states[model];
  state.codeToName = codeToName.bind(state);
}

export default states;
