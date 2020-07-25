module.exports = {
  // Add this line to your Jest config
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  }
};
