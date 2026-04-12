import { Publisher, SeedEvent, Subjects } from "@showsphere/common";

export class SeedPublisher extends Publisher<SeedEvent>{
        subject: Subjects.Seed=Subjects.Seed;
}