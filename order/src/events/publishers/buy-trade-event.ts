import { BuyTrade, Publisher, Subjects } from "@showsphere/common";


export class BuyTradePublisher extends Publisher<BuyTrade> {
        subject: Subjects.BuyTrade=Subjects.BuyTrade
}