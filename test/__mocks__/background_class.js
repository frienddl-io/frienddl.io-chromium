export const mockStopSearch = jest.fn();
const mock = jest.fn().mockImplementation(() => {
  return true;
});

export default mock;
