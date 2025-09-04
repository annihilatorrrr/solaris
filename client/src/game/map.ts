import * as PIXI from 'pixi.js'
import Background from './background'
import Star, { type BasicStarClickEvent, type StarClickEvent } from './star'
import Waypoints from './waypoints'
import RulerPoints from './rulerPoints'
import Territories from './territories'
import PlayerNames from './playerNames'
import gameHelper from '../services/gameHelper'
import AnimationService from './animation'
import PathManager from './PathManager'
import OrbitalLocationLayer from './orbital'
import WormHoleLayer from './wormHole'
import TooltipLayer from './tooltip'
import { type DrawingContext } from "./container";
import type {Game, Player, Star as StarData, Carrier as CarrierData} from "../types/game";
import type {Location, MapObject, UserGameSettings} from "@solaris-common";
import { Chunks } from './chunks'
import Carrier, {type CarrierClickEvent} from "./carrier";
import type { EventBus } from '../eventBus'
import MapEventBusEventNames from '../eventBusEventNames/map'
import MapCommandEventBusEventNames from "../eventBusEventNames/mapCommand";
import { createStarHighlight } from './highlight'
import {Viewport} from 'pixi-viewport'
import type {TempWaypoint} from "@/types/waypoint";
import type {RulerPoint} from "@/types/ruler";

export enum ModeKind {
  Galaxy = 'galaxy',
  Waypoints = 'waypoints',
  Ruler = 'ruler',
}

type ModeGalaxy = {
  mode: ModeKind.Galaxy,
}

type ModeRuler = {
  mode: ModeKind.Ruler,
}

type ModeWaypoints = {
  mode: ModeKind.Waypoints,
  carrier: CarrierData,
}

export type Mode = ModeGalaxy | ModeRuler | ModeWaypoints;

export type PreStarClickedCallback = () => void;

export class Map {
  // Represents the current game mode, these are as follows:
  // galaxy - Normal galaxy view
  // waypoints - Displays waypoints overlay for a given carrier
  mode: Mode = {
    mode: ModeKind.Galaxy,
  };
  eventBus: EventBus;
  app: PIXI.Application;
  context: DrawingContext;
  container: PIXI.Container;
  viewport: Viewport;
  stars: Star[];
  carriers: Carrier[];
  pathManager: PathManager;
  zoomPercent: number;
  lastZoomPercent: number;
  backgroundContainer: PIXI.Container;
  territoryContainer: PIXI.Container;
  playerNamesContainer: PIXI.Container;
  orbitalContainer: PIXI.Container ;
  wormHoleContainer: PIXI.Container;
  starContainer: PIXI.Container ;
  waypointContainer: PIXI.Container ;
  rulerPointContainer: PIXI.Container ;
  highlightLocationsContainer: PIXI.Container ;
  tooltipContainer: PIXI.Container ;
  game: Game;
  userSettings: UserGameSettings ;
  waypoints: Waypoints ;
  rulerPoints: RulerPoints ;
  territories: Territories ;
  playerNames: PlayerNames ;
  background: Background ;
  wormHoleLayer: WormHoleLayer | undefined;
  tooltipLayer: TooltipLayer;
  orbitalLayer: OrbitalLocationLayer | undefined;
  lastViewportCenter: PIXI.Point | undefined;
  currentViewportCenter: PIXI.Point | undefined;
  lastPointerDownPosition: PIXI.Point | undefined;
  chunks: Chunks;
  galaxyCenterGraphics: PIXI.Graphics | undefined;
  unsubscribe: (() => void) | undefined;

  constructor (app: PIXI.Application, viewport: Viewport, context: DrawingContext, eventBus: EventBus, game: Game, userSettings: UserGameSettings) {
    this.app = app
    this.context = context
    this.viewport = viewport;
    this.container = new PIXI.Container()
    this.container.sortableChildren = true
    this.eventBus = eventBus;

    this.stars = []

    this.carriers = []

    this.zoomPercent = 0

    this.zoomPercent = 100
    this.lastZoomPercent = 100


    this.userSettings = userSettings
    this.game = game

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.app.ticker.maxFPS = userSettings.technical.fpsLimit || 60;

    this.pathManager = new PathManager( game, userSettings, this )

    this.backgroundContainer = new PIXI.Container()
    this.backgroundContainer.zIndex = 0;
    this.territoryContainer = new PIXI.Container()
    this.territoryContainer.zIndex = 1;
    this.playerNamesContainer = new PIXI.Container()
    this.playerNamesContainer.zIndex = 7;
    this.orbitalContainer = new PIXI.Container()
    this.orbitalContainer.zIndex = 3;
    this.wormHoleContainer = new PIXI.Container()
    this.wormHoleContainer.zIndex = 5;
    this.starContainer = new PIXI.Container()
    this.starContainer.zIndex = 3;
    this.waypointContainer = new PIXI.Container()
    this.waypointContainer.zIndex = 2;
    this.waypointContainer.eventMode = 'none';
    this.rulerPointContainer = new PIXI.Container()
    this.rulerPointContainer.zIndex = 7;
    this.highlightLocationsContainer = new PIXI.Container()
    this.highlightLocationsContainer.zIndex = 6;
    this.tooltipContainer = new PIXI.Container()
    this.tooltipContainer.zIndex = 8;
    this.pathManager!.container.zIndex = 7;

    // Reset the canvas
    this.stars = []
    this.carriers = []

    // Add stars
    for (let i = 0; i < game.galaxy.stars.length; i++) {
      this.setupStar(game, userSettings, game.galaxy.stars[i])
    }

    // Add carriers
    for (let i = 0; i < game.galaxy.carriers.length; i++) {
      this.setupCarrier(game, userSettings, game.galaxy.carriers[i])
    }

    this.chunks = new Chunks(game, this.stars, this.carriers);

    this.waypoints = new Waypoints()
    this.waypoints.setup(game, this.context)
    this.waypoints.on('onWaypointCreated', this.onWaypointCreated.bind(this));
    this.waypoints.on('onWaypointOutOfRange', this.onWaypointOutOfRange.bind(this));

    this.waypointContainer.addChild(this.waypoints.container)

    this.rulerPoints = new RulerPoints(game);
    this.rulerPoints.on('onRulerPointCreated', this.onRulerPointCreated.bind(this))
    this.rulerPoints.on('onRulerPointsCleared', this.onRulerPointsCleared.bind(this))
    this.rulerPoints.on('onRulerPointRemoved', this.onRulerPointRemoved.bind(this))

    this.rulerPointContainer.addChild(this.rulerPoints.container);

    // -----------
    // Setup Territories
    this.territories = new Territories(this.context, game, userSettings);

    this.territoryContainer.addChild(this.territories.container);
    this.territories.draw();

    // -----------
    // Setup Player Names
    this.playerNames = new PlayerNames()
    this.playerNames.setup(game, userSettings, this.context)

    this.playerNamesContainer!.addChild(this.playerNames.container)
    this.playerNames.draw()

    // -----------
    // Setup Background
    this.background = new Background(game, userSettings, this.context);

    this.backgroundContainer!.addChild(this.background.container)
    this.backgroundContainer!.addChild(this.background.starContainer)
    this.background.draw()

    // -----------
    // Setup Worm Hole Paths
    if (this._isWormHolesEnabled()) {
      this.wormHoleLayer = new WormHoleLayer()
      this.drawWormHoles()
      this.wormHoleContainer!.addChild(this.wormHoleLayer.container)
    }

    // -----------
    // Setup Orbital Locations
    if (this._isOrbitalMapEnabled()) {
      this.orbitalLayer = new OrbitalLocationLayer()
      this.orbitalLayer.setup(game)

      this.orbitalContainer!.addChild(this.orbitalLayer.container)
    }

    this.tooltipLayer = new TooltipLayer()
    this.tooltipLayer.setup(this.game, this.context)
    this.tooltipContainer!.addChild(this.tooltipLayer.container)

    this.container.addChild(this.backgroundContainer)
    this.container.addChild(this.territoryContainer)
    this.container.addChild(this.wormHoleContainer)
    this.container.addChild(this.pathManager!.container)
    this.container.addChild(this.rulerPointContainer)
    this.container.addChild(this.chunks.chunksContainer)
    this.container.addChild(this.orbitalContainer)
    this.container.addChild(this.starContainer)
    this.container.addChild(this.highlightLocationsContainer)
    this.container.addChild(this.playerNamesContainer)
    this.container.addChild(this.tooltipContainer)
    this.container.addChild(this.waypointContainer)
    this.container.sortChildren();

    this.unsubscribe = this.subscribe();
  }

  subscribe() {
    const panToLocation = ({ location }: { location: Location }) => this.panToLocation(location);
    const panToObject = ({ object }: { object: MapObject<string> }) => this.panToObject(object);
    const panToUser = () => this.panToUser(this.game!);
    const panToPlayer = ({ player }: { player: Player }) => this.panToPlayer(this.game!, player);
    const clearHighlightedLocations = () => this.clearHighlightedLocations();
    const highlightLocation = ({ location }: { location: Location }) => this.highlightLocation(location);
    const clickStar = ({ starId }: { starId: string }) => this.clickStar(starId);
    const clickCarrier = ({ carrierId }: { carrierId: string }) => this.clickCarrier(carrierId);
    const removeLastRulerWaypoint = () => this.removeLastRulerPoint();
    const showIgnoreBulkUpgrade = () => this.showIgnoreBulkUpgrade();
    const hideIgnoreBulkUpgrade = () => this.hideIgnoreBulkUpgrade();
    const unselectAllCarriers = () => this.unselectAllCarriers();
    const unselectAllStars = () => this.unselectAllStars();
    const resetMode = () => this.resetMode();
    const setMode = (mode: Mode) => this.setMode(mode);
    const updateWaypoints = () => this.drawWaypoints();

    this.eventBus.on(MapCommandEventBusEventNames.MapCommandPanToLocation, panToLocation);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandPanToObject, panToObject);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandPanToUser, panToUser);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandPanToPlayer, panToPlayer);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandClearHighlightedLocations, clearHighlightedLocations);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandHighlightLocation, highlightLocation);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandClickStar, clickStar);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandClickCarrier, clickCarrier);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandRemoveLastRulerPoint, removeLastRulerWaypoint);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandShowIgnoreBulkUpgrade, showIgnoreBulkUpgrade);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandHideIgnoreBulkUpgrade, hideIgnoreBulkUpgrade);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandUnselectAllCarriers, unselectAllCarriers);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandUnselectAllStars, unselectAllStars);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandResetMode, resetMode);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandSetMode, setMode);
    this.eventBus.on(MapCommandEventBusEventNames.MapCommandUpdateWaypoints, updateWaypoints);

    return () => {
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandPanToLocation, panToLocation);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandPanToObject, panToObject);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandPanToUser, panToUser);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandPanToPlayer, panToPlayer);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandClearHighlightedLocations, clearHighlightedLocations);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandHighlightLocation, highlightLocation);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandClickStar, clickStar);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandClickCarrier, clickCarrier);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandRemoveLastRulerPoint, removeLastRulerWaypoint);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandShowIgnoreBulkUpgrade, showIgnoreBulkUpgrade);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandHideIgnoreBulkUpgrade, hideIgnoreBulkUpgrade);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandUnselectAllCarriers, unselectAllCarriers);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandUnselectAllStars, unselectAllStars);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandResetMode, resetMode);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandSetMode, setMode);
      this.eventBus.off(MapCommandEventBusEventNames.MapCommandUpdateWaypoints, updateWaypoints);
    }
  }

  destroy () {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = undefined;
    this.tooltipLayer?.destroy();
  }

  setupStar (game: Game, userSettings: UserGameSettings, starData: StarData) {
    let star = this.stars.find(x => x.data._id === starData._id)

    if (!star) {
      star = new Star(this.app, this.game, starData, userSettings, this.context);
      this.stars.push(star);

      this.starContainer!.addChild(star.fixedContainer);

      star.on('onStarClicked', this.onStarClicked.bind(this));
      star.on('onStarRightClicked', this.onStarRightClicked.bind(this));
      star.on('onStarDefaultClicked', this.onStarDefaultClicked.bind(this));
      star.on('onStarMouseOver', this.onStarMouseOver.bind(this));
      star.on('onStarMouseOut', this.onStarMouseOut.bind(this));
      star.on('onSelected', this.onStarSelected.bind(this));
      star.on('onUnselected', this.onStarUnselected.bind(this));
    } else {
      star.update(this.game, starData, userSettings);
    }

    return star;
  }

  setupCarrier (game: Game, userSettings: UserGameSettings, carrierData: CarrierData) {
    let carrier = this.carriers.find(x => x.data!._id === carrierData._id)

    if (!carrier) {
      carrier = new Carrier(game, carrierData, userSettings, this.context, this.pathManager);
      this.carriers.push(carrier);

      carrier.on('onCarrierClicked', this.onCarrierClicked.bind(this))
      carrier.on('onCarrierRightClicked', this.onCarrierRightClicked.bind(this))
      carrier.on('onCarrierMouseOver', this.onCarrierMouseOver.bind(this))
      carrier.on('onCarrierMouseOut', this.onCarrierMouseOut.bind(this))
      carrier.on('onSelected', this.onCarrierSelected.bind(this))
      carrier.on('onUnselected', this.onCarrierUnselected.bind(this))
    }

    carrier.update(carrierData, userSettings);

    return carrier
  }

  draw () {
    this.drawGalaxyCenter()

    if (this.mode.mode === 'waypoints') {
      this.drawWaypoints()
    } else {
      this.drawStars()
      this.drawCarriers()
      this.clearWaypoints()
    }

    if (this.mode.mode === 'ruler') {
      this.drawRulerPoints()
    } else {
      this.clearRulerPoints()
    }

    this.refreshZoom();
  }

  drawGalaxyCenter () {
    if (this.galaxyCenterGraphics) {
      this.starContainer.removeChild(this.galaxyCenterGraphics);
    }

    const userWantsToSeeCenter = this._isOrbitalMapEnabled() || this.userSettings?.map.galaxyCenterAlwaysVisible === 'enabled';

    if (this.game.constants.distances.galaxyCenterLocation && userWantsToSeeCenter) {
        this.galaxyCenterGraphics = new PIXI.Graphics()
        const location : Location = this.game!.constants.distances.galaxyCenterLocation
        let size = 10

        this.galaxyCenterGraphics.moveTo(location.x, location.y - size)
        this.galaxyCenterGraphics.lineTo(location.x, location.y + size)
        this.galaxyCenterGraphics.moveTo(location.x - size, location.y)
        this.galaxyCenterGraphics.lineTo(location.x + size, location.y)
        this.galaxyCenterGraphics.stroke({
          width: 2,
          color: 0xFFFFFF,
          alpha: 0.75,
        });

        this.starContainer.addChild(this.galaxyCenterGraphics);
    }
  }

  _isOrbitalMapEnabled () {
    return this.game.constants.distances.galaxyCenterLocation && this.game.settings.orbitalMechanics.enabled === 'enabled'
  }

  _isWormHolesEnabled () {
    return this.game.settings.specialGalaxy.randomWormHoles
      || this.game.galaxy.stars.find(s => s.wormHoleToStarId)
  }

  reloadGame (game: Game, userSettings: UserGameSettings) {
    this.app.ticker.maxFPS = userSettings.technical.fpsLimit;

    this.userSettings = userSettings;
    this.game = game;

    this.pathManager.update(game, userSettings);

    this.drawGalaxyCenter();

    // Check for stars that are no longer in scanning range.
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      const gameStar = gameHelper.getStarById(game, star.data._id)

      if (!gameStar) {
        this._undrawStar(star)
        i--
      }
    }

    // Check for carriers that are no longer in scanning range or have been destroyed.
    for (let i = 0; i < this.carriers.length; i++) {
      const carrier = this.carriers[i]
      const gameCarrier = gameHelper.getCarrierById(game, carrier.data!._id)

      if (!gameCarrier) {
        this._undrawCarrier(carrier)
        i--
      }
    }

    // Update all of the stars and add any newly discovered ones.
    for (let i = 0; i < game.galaxy.stars.length; i++) {
      const starData = game.galaxy.stars[i]
      let existing = this.stars.find(x => x.data._id === starData._id)

      if (existing) {
        existing.update(this.game, starData, userSettings);
      } else {
        existing = this.setupStar(game, userSettings, starData)
      }

      this.drawStar(existing)
    }

    // Update all of the carriers and add new ones that have been built.
    for (let i = 0; i < game.galaxy.carriers.length; i++) {
      const carrierData = game.galaxy.carriers[i]

      let existing = this.carriers.find(x => x.data!._id === carrierData._id)

      if (existing) {
        existing.update(carrierData, userSettings);
      } else {
        existing = this.setupCarrier(game, userSettings, carrierData)
      }

      this.drawCarrier(existing)
    }

    this.drawTerritories(userSettings);
    this.drawWormHoles();
    this.drawPlayerNames();

    this.background = new Background(game, userSettings, this.context);
    this.background.draw();

    this.waypoints.setup(game, this.context);
    this.tooltipLayer.setup(game, this.context);

    this.chunks.update(game, this.stars, this.carriers);

    this.refreshZoom();
  }


  _disableCarriersInteractivity() {
    for (let i = 0; i < this.carriers.length; i++) {
      let c = this.carriers[i]

      c.disableInteractivity()
    }
  }

  _enableCarriersInteractivity() {
    for (let i = 0; i < this.carriers.length; i++) {
      let c = this.carriers[i]

      c.enableInteractivity()
    }
  }

  setMode (mode: Mode) {
    let wasWaypoints = this.mode.mode === ModeKind.Waypoints;

    this.mode = mode;

    this.unselectAllCarriers()
    this.unselectAllStars()
    this.clearWaypoints()
    this.clearRulerPoints()

    if (this.mode.mode === ModeKind.Waypoints) {
      this._disableCarriersInteractivity()
      this.drawWaypoints();
    }

    if (wasWaypoints) {
      this._enableCarriersInteractivity()
    }

    if (this.mode.mode === ModeKind.Ruler) {
      this.drawRulerPoints()
    }
  }

  resetMode () {
    this.setMode({
      mode: ModeKind.Galaxy
    });
  }

  removeLastRulerPoint () {
    this.rulerPoints.removeLastRulerPoint()
  }

  drawStars () {
    for (let star of this.stars) {
      this.drawStar(star);
    }
  }

  drawStar (star: Star) {
    star.draw()
    star.onZoomChanging(this.zoomPercent)
  }

  _undrawStar (star: Star) {
    star.removeAllListeners();

    this.starContainer.removeChild(star.fixedContainer);

    this.chunks.removeMapObjectFromChunks(star);

    this.stars.splice(this.stars.indexOf(star), 1);

    star.destroy();
  }

  drawCarriers () {
    for (let i = 0; i < this.carriers.length; i++) {
      let carrier = this.carriers[i]

      this.drawCarrier(carrier)
    }
  }

  drawCarrier (carrier: Carrier) {
    carrier.draw()
    carrier.onZoomChanging(this.zoomPercent)
  }

  _undrawCarrier (carrier: Carrier) {
    carrier.removeAllListeners();

    this.chunks!.removeMapObjectFromChunks(carrier);
    this.carriers.splice(this.carriers.indexOf(carrier), 1)

    carrier.destroy()
  }

  undrawCarrier (carrierData: CarrierData) {
    const existing = this.carriers.find(x => x.data!._id === carrierData._id);

    if (existing) {
      this._undrawCarrier(existing);
    }
  }

  drawWaypoints () {
    if (this.mode.mode === ModeKind.Waypoints) {
      this.waypoints.draw(this.mode.carrier);
    }

    for (let i = 0; i < this.carriers.length; i++) {
      let c = this.carriers[i];

      c.drawCarrierWaypoints();
    }
  }

  clearWaypoints () {
    this.waypoints.clear();
  }

  drawRulerPoints () {
    this.rulerPoints.draw();
  }

  clearRulerPoints () {
    this.rulerPoints.update(this.game);
  }

  drawTerritories (userSettings: UserGameSettings) {
    this.territories.update(this.game, userSettings);
    this.territories.draw();
  }

  drawWormHoles () {
    if (this._isWormHolesEnabled()) {
      if (!this.wormHoleLayer) {
        this.wormHoleLayer = new WormHoleLayer();
      }

      this.wormHoleLayer!.setup(this.game)
      this.wormHoleLayer!.draw()
    }
  }

  drawPlayerNames () {
    this.playerNames.setup(this.game, this.userSettings, this.context)
    this.playerNames.draw()
  }

  panToPlayer (game: Game, player: Player) {
    const empireCenter = gameHelper.getPlayerEmpireCenter(game, player)

    if (empireCenter) {
      this.viewport.moveCenter(empireCenter.x, empireCenter.y)

      this.refreshZoom()
    }
  }

  panToUser (game: Game) {
    const player = gameHelper.getUserPlayer(game);

    if (!player) {
      const galaxyCenterX = gameHelper.calculateGalaxyCenterX(game);
      const galaxyCenterY = gameHelper.calculateGalaxyCenterY(game);

      this.panToLocation({ x: galaxyCenterX, y: galaxyCenterY })
      return
    }

    this.panToPlayer(game, player)
  }

  panToObject(object: { location: Location }) {
    this.panToLocation(object.location);

    this.refreshZoom();
  }

  panToLocation (location: Location) {
    this.viewport.moveCenter(location.x, location.y)
  }

  clickStar (starId: string) {
    const star = this.stars.find(s => s.data._id === starId)!;

    star.onClicked(null, false);
    star.select();
  }

  clickCarrier (carrierId: string) {
    const carrier = this.carriers.find(s => s.data!._id === carrierId)!;

    carrier.onClicked(null, false);
    carrier.select();
  }

  unselectAllStars () {
    for (let i = 0; i < this.stars.length; i++) {
      let s = this.stars[i]

      s.unselect()
    }
  }

  unselectAllCarriers () {
    for (let i = 0; i < this.carriers.length; i++) {
      let c = this.carriers[i]

      c.unselect()
    }
    this.clearCarrierHighlights();
  }

  unselectAllStarsExcept (star: Star) {
    this.stars
      .filter(s => s.isSelected || s.data._id === star.data._id) // Get only stars that are selected or the e star.
      .forEach(s => {
        // Set all other stars to unselected.
        if (s.data._id !== star.data._id) {
          s.unselect()
        }
      })
  }

  unselectAllCarriersExcept (carrier: Carrier) {
    this.carriers
      .filter(c => c.isSelected || c.data!._id === carrier.data._id) // Get only stars that are selected or the e star.
      .forEach(c => {
        // Set all other carriers to unselected.
        if (c.data!._id !== carrier.data._id) {
          c.unselect()
        }
      })
      this.clearCarrierHighlights();
  }

  clearCarrierHighlights() {
    this.waypoints!.clear();
  }

  onTick(deltaTime: number) {
    const viewportWidth = this.viewport.right - this.viewport.left;
    const viewportHeight = this.viewport.bottom - this.viewport.top;

    const viewportXRadius = viewportWidth / 2.0
    const viewportYRadius = viewportHeight / 2.0

    const viewportCenter = this.viewport.center

    this.lastViewportCenter = this.currentViewportCenter || undefined;
    this.currentViewportCenter = this.viewport.center

    this.zoomPercent = this.getViewportZoomPercentage();

    const viewportData = {
      center: viewportCenter,
      xradius: viewportXRadius,
      yradius: viewportYRadius
    }

    this.background!.onTick(deltaTime, viewportData);

    //chunk culling

    const positionChanging = this.lastViewportCenter == null || this.currentViewportCenter.x !== this.lastViewportCenter.x || this.currentViewportCenter.y !== this.lastViewportCenter.y
    const zoomChanging = Math.abs(this.zoomPercent-this.lastZoomPercent) > (1.0/128.0)

    this.chunks!.onTick(positionChanging, zoomChanging, this.zoomPercent, {
      left: this.viewport.left,
      right: this.viewport.right,
      top: this.viewport.top,
      bottom: this.viewport.bottom,
    });

    this.pathManager!.onTick(this.zoomPercent, this.viewport, zoomChanging)
    this.playerNames!.onTick(this.zoomPercent, zoomChanging)

    this.lastZoomPercent = this.zoomPercent;
  }

  onZoomed () {
    this.refreshZoom();
  }

  onViewportPointerDown(e) {
    //need Object.assign, wich is weird since pixie says it creates a new point each time
    this.lastPointerDownPosition = Object.assign({}, e.data.global)
  }

  //not sure where to put this func
  isDragMotion(position: Location) {
    const DRAG_THRESHOLD = 8 //max distance in pixels
    const dxSquared = Math.pow(Math.abs(this.lastPointerDownPosition!.x - position.x),2)
    const dySquared = Math.pow(Math.abs(this.lastPointerDownPosition!.y - position.y),2)
    const distance = Math.sqrt(dxSquared+dySquared)

    return (distance > DRAG_THRESHOLD)
  }

  onStarClicked (dic: StarClickEvent) {
    // ignore clicks if its a drag motion
    const e = dic.starData
    if (dic.eventData && this.isDragMotion(dic.eventData.global)) {
      return;
    }

    const click = () => {
      dic.permitCallback && dic.permitCallback();

      this.selectStar(e, dic);
    };

    const doNormalClick = this.userSettings.interface.shiftKeyMentions === 'enabled' && !dic.eventData?.shiftKey;

    if (doNormalClick) {
      click();
      return;
    }

    const owningPlayer = gameHelper.getStarOwningPlayer(this.game, dic.starData);

    this.eventBus.emit(MapEventBusEventNames.MapOnPreStarClicked, {
      star: dic.starData,
      owningPlayer,
      defaultCallback: click,
    });
  }

  selectStar (e: StarData, dic: BasicStarClickEvent) {
    // Clicking stars should only raise events to the UI if in galaxy mode.
    if (this.mode.mode === ModeKind.Galaxy) {
      let selectedStar = this.stars.find(x => x.data._id === e._id)

      this.unselectAllCarriers()
      selectedStar && this.unselectAllStarsExcept(selectedStar);

      if (!dic.tryMultiSelect || !this.tryMultiSelect(e.location)) {
        selectedStar?.toggleSelected()
        this.eventBus.emit(MapEventBusEventNames.MapOnStarClicked, { star: e })
      }
    } else if (this.mode.mode === ModeKind.Waypoints) {
      this.waypoints!.onStarClicked(e)
    } else if (this.mode.mode === ModeKind.Ruler) {
      this.rulerPoints.onStarClicked(e)
    }
    AnimationService.drawSelectedCircle(this.app, this.container, e.location)
  }

  onStarDefaultClicked (dic: BasicStarClickEvent) {
    // ignore clicks if its a drag motion
    let e = dic.starData
    if (dic.eventData && this.isDragMotion(dic.eventData.global)) { return }

    this.selectStar(e, dic);
  }

  onStarRightClicked (dic: BasicStarClickEvent) {
    // ignore clicks if its a drag motion
    const e = dic.starData
    if (dic.eventData && this.isDragMotion(dic.eventData.global)) { return }

    const owningPlayer = gameHelper.getStarOwningPlayer(this.game!, dic.starData);

    const click = () =>  {
      if (this.mode.mode === ModeKind.Galaxy) {
        this.eventBus.emit(MapEventBusEventNames.MapOnStarRightClicked, { star: e })
      }
    };

    const doNormalClick = this.userSettings.interface.shiftKeyMentions === 'enabled' && !dic.eventData?.shiftKey;
    if (doNormalClick) {
      click();
      return;
    }

    this.eventBus.emit(MapEventBusEventNames.MapOnPreStarRightClicked, {
      star: dic.starData,
      owningPlayer,
      defaultCallback: click,
    });
  }

  onCarrierClicked (ev: CarrierClickEvent) {
    // ignore clicks if its a drag motion
    if (ev.eventData && this.isDragMotion(ev.eventData.global)) { return }

    const e = ev.carrierData
    // Clicking carriers should only raise events to the UI if in galaxy mode.
    if (this.mode.mode === ModeKind.Galaxy) {

      const selectedCarrier = this.carriers.find(x => x.data!._id === e._id)

      this.unselectAllStars()
      selectedCarrier && this.unselectAllCarriersExcept(selectedCarrier)

      selectedCarrier!.toggleSelected()

      //highlight carrier path if selected
      if (selectedCarrier?.isSelected) {
        this.waypoints!.draw(selectedCarrier!.data!, false);
      }
      else {
        this.waypoints!.clear();
      }

      if (!ev.tryMultiSelect || !this.tryMultiSelect(e.location)) {
        this.eventBus.emit(MapEventBusEventNames.MapOnCarrierClicked, { carrier: e })
      } else {
        selectedCarrier!.unselect()
      }
    } else if (this.mode.mode === ModeKind.Ruler) {
      this.rulerPoints.onCarrierClicked(e)
    }

    AnimationService.drawSelectedCircle(this.app, this.container, e.location)
  }

  onCarrierRightClicked (carrier: CarrierData) {
    if (this.mode.mode === ModeKind.Galaxy) {
      this.eventBus.emit(MapEventBusEventNames.MapOnCarrierRightClicked, { carrier });
    }
  }

  onCarrierMouseOver (carrier: CarrierData) {
    // If the carrier is orbiting something then send the mouse over event
    // to the star.
    if (carrier.orbiting) {
      const star = this.stars.find(s => s.data._id === carrier.orbiting);
      star!.onMouseOver();
    }

    this.tooltipLayer!.drawTooltipCarrier(carrier);
  }

  onCarrierMouseOut (carrier: CarrierData) {
    // If the carrier is orbiting something then send the mouse over event
    // to the star.
    if (carrier.orbiting) {
      const star = this.stars.find(s => s.data._id === carrier.orbiting);
      star!.onMouseOut();
    }

    this.tooltipLayer!.clear();
  }

  onStarMouseOver (star: StarData) {
    this.tooltipLayer!.drawTooltipStar(star);
  }

  onStarMouseOut (star: StarData) {
    this.tooltipLayer!.clear()
  }

  onWaypointCreated (waypoint: TempWaypoint) {
    this.eventBus.emit(MapEventBusEventNames.MapOnWaypointCreated, { waypoint })
  }

  onWaypointOutOfRange () {
    this.eventBus.emit(MapEventBusEventNames.MapOnWaypointOutOfRange)
  }

  onRulerPointCreated (rulerPoint: RulerPoint) {
    this.eventBus.emit(MapEventBusEventNames.MapOnRulerPointCreated, { rulerPoint });
  }

  onRulerPointRemoved (rulerPoint: RulerPoint) {
    this.eventBus.emit(MapEventBusEventNames.MapOnRulerPointRemoved, { rulerPoint });
  }

  onRulerPointsCleared () {
    this.eventBus.emit(MapEventBusEventNames.MapOnRulerPointsCleared);
  }

  tryMultiSelect (location: Location) {
    // See if there are any other objects close by, if so then
    // we want to allow the user to select which one they want as there might be
    // objects on the map that are on top of eachother or very close together.
    const distance = 10

    let closeStars: {
      type: string;
      distance: number;
      ref: any;
      data: any;
    }[] = this.stars
      .map(s => {
        return {
          ref: s,
          type: 'star',
          distance: gameHelper.getDistanceBetweenLocations(location, s.data.location),
          data: s.data,
        }
      })
      .filter(s => s.distance <= distance)

    let closeCarriers = this.carriers
      .map(s => {
        return {
          ref: s,
          type: 'carrier',
          distance: gameHelper.getDistanceBetweenLocations(location, s.data!.location),
          data: s.data
        }
      })
      .filter(s => s.distance <= distance)

    // Combine the arrays and order by closest first.
    let closeObjects = closeStars.concat(closeCarriers)
      .sort((a, b) => {
        if (a.type !== b.type) { // Sort stars first
          return b.type.localeCompare(a.type);
        }

        if (a.distance === b.distance) {
          return a.data!.name.localeCompare(b.data!.name); // If the distances are identical, sort by name ascending.
        }

        return a.distance < b.distance ? -1 : 1; // Finally, sort by distance ascending.
      });

    if (closeObjects.length > 1) {
      let star = closeObjects.find(co => co.type === 'star')

      if (star) {
        star.ref.toggleSelected() // Select to star to get the ranges drawn on the map
      }

      let eventObj = closeObjects.map(co => {
        return {
          type: co.type,
          data: co.data,
          distance: co.distance
        }
      })

      this.eventBus.emit(MapEventBusEventNames.MapOnObjectsClicked, {
        objects: eventObj
      })

      return true
    }

    return false
  }

  getViewportZoomPercentage () {
    const viewportWidth = this.viewport.right - this.viewport.left;
    return (this.viewport.screenWidth / viewportWidth) * 100;
  }

  refreshZoom () {
    const zoomPercent = this.getViewportZoomPercentage();

    this.stars.forEach(s => s.refreshZoom(zoomPercent));
    this.carriers.forEach(c => c.refreshZoom(zoomPercent));

    if (this.territories) {
      this.territories.refreshZoom(zoomPercent);
    }

    if (this.playerNames) {
      this.playerNames.refreshZoom(zoomPercent);
    }

    if (this.background) {
      this.background.refreshZoom(zoomPercent);
    }
  }

  highlightLocation (location: Location, opacity = 1) {
    const graphics = createStarHighlight(location, opacity);
    this.highlightLocationsContainer!.addChild(graphics);
  }

  clearHighlightedLocations () {
    this.highlightLocationsContainer!.removeChildren()
  }

  showIgnoreBulkUpgrade () {
    for (let star of this.stars) {
      star.showIgnoreBulkUpgrade()
    }
  }

  hideIgnoreBulkUpgrade () {
    for (let star of this.stars) {
      star.hideIgnoreBulkUpgrade()
    }
  }

  onStarSelected (star: StarData) {
    if (this._isOrbitalMapEnabled()) {
      this.orbitalLayer!.drawStar(star);
    }
  }

  onStarUnselected (_star: StarData) {
    if (this._isOrbitalMapEnabled()) {
      this.orbitalLayer!.clear();
    }
  }

  onCarrierSelected (carrier: CarrierData) {
    if (this._isOrbitalMapEnabled()) {
      this.orbitalLayer!.drawCarrier(carrier);
    }
  }

  onCarrierUnselected (_carrier: CarrierData) {
    if (this._isOrbitalMapEnabled()) {
      this.orbitalLayer!.clear()
    }
  }
}

export default Map
