import Repository from "./repository";
import {Announcement} from "./types/Announcement";
import {DBObjectId, objectId} from "./types/DBObjectId";
import UserService from "./user";
import ValidationError from "../errors/validation";
import {Model} from "mongoose";

export type AnnouncementState = {
    lastReadAnnouncement: DBObjectId | null,
    unreadCount: number,
    totalAnnouncements: number
}

export default class AnnouncementService {
    announcementModel: Model<Announcement>;
    announcementRepo: Repository<Announcement>;
    userService: UserService;

    constructor(announcementModel, announcementRepo: Repository<Announcement>, userService: UserService) {
        this.announcementModel = announcementModel;
        this.announcementRepo = announcementRepo;
        this.userService = userService;
    }

    async getLatestAnnouncement(): Promise<Announcement | null> {
        return this.announcementModel.findOne({}).sort({ date: 1 }).exec();
    }

    async getAnnouncementState(userId: DBObjectId): Promise<AnnouncementState> {
        const user = await this.userService.getById(userId);

        if (!user) {
            throw new ValidationError("User not found");
        }

        const lastReadAnnouncement = user.lastReadAnnouncement?.toString();
        const announcementIds: { _id: DBObjectId }[] = await this.announcementModel.find().sort({ date: 1 }).select({ _id: 1 }).exec();

        let unreadCount: number;
        if (lastReadAnnouncement) {
            unreadCount = announcementIds.findIndex(a => a._id.toString() === lastReadAnnouncement);
        } else {
            unreadCount = announcementIds.length;
        }

        return {
            lastReadAnnouncement: user.lastReadAnnouncement,
            unreadCount,
            totalAnnouncements: announcementIds.length
        }
    }

    async markAsRead(userId: DBObjectId) {
        const latest = await this.getLatestAnnouncement();

        if (!latest) {
            return;
        }

        await this.userService.updateLastReadAnnouncement(userId, latest._id);
    }

    async getAllAnnouncements(): Promise<Announcement[]> {
        return this.announcementModel.find().sort({ date: 1 }).exec();
    }

    async createAnnouncement(title: String, date: Date, content: String) {
        const doc: Announcement = { _id: objectId(), title, date, content };
        await this.announcementRepo.insertOne(doc);
    }

    async deleteAnnouncement(announcementId: DBObjectId | undefined) {
        if (!announcementId) {
            throw new ValidationError("Announcement ID is required");
        }

        await this.announcementRepo.deleteOne({ _id: announcementId });
    }
}