import { log } from "console";
import Redis from "ioredis";

class BanIPManager {
  private redis: Redis;
  private Version_Ban:string="Version_Ban";
  constructor() {
    this.redis = new Redis();
  }

  async addBanIP(
    ip: string,
    unbanTime: number,
    banTime: number
  ): Promise<void> {
    await this.redis.hmset(`listbanIP:${ip}`, {
      unbanTime: unbanTime,
      banTime: banTime,
    });
    await this.redis.set(this.Version_Ban,Date.now())
  }
  async getVersion(){
    // console.log(await this.redis.get("Version_Ban"));
    return await this.redis.get(this.Version_Ban);
  }
  async isBanIP(
    ip: string
  ): Promise<{ unbanTime: number; banTime: number } | null> {
    const result = await this.redis.hgetall(`listbanIP:${ip}`);

    if (Object.keys(result).length === 0) return null;
    const StatusBan = await this.CheckTimeBanIp(Number(result.unbanTime), ip);
    console.log("StatusBan", StatusBan);
    return {
      unbanTime: Number(result.unbanTime),
      banTime: Number(result.banTime),
    };
  }

  async removeBanIP(ip: string): Promise<void> {
    await this.redis.del(`listbanIP:${ip}`);
    await this.redis.set(this.Version_Ban,Date.now())
  }

  async getBanDetails(
    ip: string
  ): Promise<{ unbanTime: number; banTime: number } | null> {
    const result = await this.redis.hgetall(`listbanIP:${ip}`);
    if (Object.keys(result).length === 0) return null;
    return {
      unbanTime: Number(result.unbanTime),
      banTime: Number(result.banTime),
    };
  }
  async CheckTimeBanIp(unbanTime: number, ip: string): Promise<string> {
    // const banDetails = await this.isBanIP(ip);
    if (Date.now() >= unbanTime) {
      await this.removeBanIP(ip);
      console.log(`Unbanned IP: ${ip}`);
      return "UnbanSuccess";
    }
    return "NoUnban";
  }
  async getAllBannedIPsAndDetails(): Promise<{
    [ip: string]: { unbanTime: number; banTime: number };
  }> {
    const keys = await this.redis.keys("listbanIP:*");
    const ips = keys.map((key) => key.replace("listbanIP:", ""));

    const ipDetails: { [ip: string]: { unbanTime: number; banTime: number } } =
      {};

    for (const ip of ips) {
      const details = await this.redis.hgetall(`listbanIP:${ip}`);
      if (Object.keys(details).length > 0) {
        ipDetails[ip] = {
          unbanTime: Number(details.unbanTime),
          banTime: Number(details.banTime),
        };
      }
    }
    return ipDetails;
  }
}

// ให้ปลดแบนภายใน 10 วินาที
const banManager = new BanIPManager();
const unbanTime = Date.now() + 10000;

banManager.addBanIP("192.168.0.1", unbanTime, Date.now()).then(async () => {
  console.log(banManager.getVersion());
  let banDetails = await banManager.isBanIP("192.168.0.1");
  console.log(await banManager.getAllBannedIPsAndDetails());
  if (banDetails) {
    console.log(
      `IP is banned. Unban time: ${banDetails.unbanTime}, Ban time: ${banDetails.banTime}`
    );
    // รอดีเลย์ 15 วินาที และเช็คอีก 1 รอบ
    setTimeout(async () => {
      banDetails = await banManager.isBanIP("192.168.0.1");
      console.log(await banManager.getAllBannedIPsAndDetails());
    }, 15000);
  } else {
    console.log("IP is not banned.");
  }
});
