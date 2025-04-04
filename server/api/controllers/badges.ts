import { DependencyContainer } from '../../services/types/DependencyContainer';

export default (container: DependencyContainer) => {
    return {
        listAll: async (req, res, next) => {
            try {
                const result = container.badgeService.listBadges();
                
                res.status(200).json(result);
                return next();
            } catch (err) {
                return next(err);
            }
        },
        listForUser: async (req, res, next) => {
            try {
                const result = await container.badgeService.listBadgesByUser(req.params.userId);
                
                res.status(200).json(result);
                return next();
            } catch (err) {
                return next(err);
            }
        },
        listForPlayer: async (req, res, next) => {
            try {
                const result = await container.badgeService.listBadgesByPlayer(req.game, req.params.playerId);
                
                res.status(200).json(result);
                return next();
            } catch (err) {
                return next(err);
            }
        },
        purchaseForPlayer: async (req, res, next) => {
            try {
                await container.badgeService.purchaseBadgeForPlayer(req.game, req.session.userId, req.params.playerId, req.body.badgeKey);
                
                res.sendStatus(200);
                return next();
            } catch (err) {
                return next(err);
            }
        }
    }
};
