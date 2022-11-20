export default class Store {
  constructor(state) {
    Object.assign(this, state);
  }
}

export const initialState = async ({ req }) => ({
  challenge: req.challenge
});
