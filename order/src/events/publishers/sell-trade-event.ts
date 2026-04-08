import { Publisher, Subjects,SellTradeEvent } from "@showsphere/common";

export class SellTradePublisher extends Publisher <SellTradeEvent>{
        subject: Subjects.SellTrade=Subjects.SellTrade
}