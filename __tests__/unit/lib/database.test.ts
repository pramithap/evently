jest.mock("mongoose", () => ({
  __esModule: true,
  default: { connect: jest.fn() },
}));

const loadDb = async (uri: string | undefined) => {
  jest.resetModules();
  delete (global as any).mongoose;
  if (uri === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = uri;
  const mongoose = (await import("mongoose")).default as unknown as {
    connect: jest.Mock;
  };
  const db = await import("@/lib/database");
  return { mongoose, connectToDatabase: db.connectToDatabase };
};

describe("connectToDatabase", () => {
  const originalUri = process.env.MONGODB_URI;

  afterAll(() => {
    process.env.MONGODB_URI = originalUri;
  });

  it("throws when MONGODB_URI is missing", async () => {
    const { connectToDatabase, mongoose } = await loadDb(undefined);

    await expect(connectToDatabase()).rejects.toThrow("MONGODB_URI is missing");
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it("connects once with the expected options and caches the connection", async () => {
    const { connectToDatabase, mongoose } = await loadDb("mongodb://db:27017");
    const conn = { name: "conn" };
    mongoose.connect.mockResolvedValue(conn);

    await expect(connectToDatabase()).resolves.toBe(conn);
    await expect(connectToDatabase()).resolves.toBe(conn);

    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://db:27017", {
      dbName: "devOVerflow",
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  });

  it("shares one in-flight connection between concurrent callers", async () => {
    const { connectToDatabase, mongoose } = await loadDb("mongodb://db:27017");
    mongoose.connect.mockResolvedValue({});

    await Promise.all([connectToDatabase(), connectToDatabase()]);

    expect(mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("retries on the next call after a failed connection", async () => {
    const { connectToDatabase, mongoose } = await loadDb("mongodb://db:27017");
    const conn = { name: "conn" };
    mongoose.connect
      .mockRejectedValueOnce(new Error("querySrv ENOTFOUND"))
      .mockResolvedValueOnce(conn);

    await expect(connectToDatabase()).rejects.toThrow("querySrv ENOTFOUND");
    await expect(connectToDatabase()).resolves.toBe(conn);

    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });
});
