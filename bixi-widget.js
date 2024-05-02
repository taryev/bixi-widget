/**
 * SCRIPTABLE BIXI WIDGET
 * Quentin Veyrat / https://github.com/taryev
 *
 * État des stations de vélo-partage BIXI Montréal
 *
 * ---
 * Icons from : Icons8.com
 *
 * **/

/** Widget settings **/
const settings = {
    // Global
    "debug": false,
    "cache_folder_name": "bixi-widget",
    "assets_base_url": "https://lab.deltaplane.dev/bixiwidget/assets/",
    "gbfs_stations_status_url": "https://gbfs.velobixi.com/gbfs/fr/station_status.json",
    "gbfs_stations_status_file": "station_status.json",
    "show_ebikes": true,

    // Stations
    "stations": {
        "Métro Sherbrooke": "19",
        "ÉTS (Peel/N-D)": "77",
    },

    // UI
    "update_font": Font.ultraLightSystemFont(12),
    "figures_font": Font.regularRoundedSystemFont(16),
    "station_font": Font.regularSystemFont(14),
    "bike_color": Color.white(),
    "ebike_color": Color.blue(),
    "parking_color": Color.white(),
    "icon_size": new Size(20,20),
    "accessory_scale_factor": 0.9,
}

/** Date Formatter **/
const dateFormatter = new DateFormatter()
dateFormatter.useMediumTimeStyle()

/** Files Manager - Cache **/
const files = FileManager.local()
const cachePath = files.joinPath(files.cacheDirectory(), settings.cache_folder_name)
if(settings.debug) files.remove(cachePath)
if(!files.isDirectory(cachePath)) files.createDirectory(cachePath)
const isOnline = await onlineCheck()

/** Assets **/
const assets = await loadAssets()

/** Widget display **/
if (config.runsInAccessoryWidget) {
    const widget = await createLockScreenWidget()
    Script.setWidget(widget)
} else if (config.runsInWidget) {
    const widget = await createHomeScreenWidget()
    Script.setWidget(widget)
}
else {
    const widget = await createHomeScreenWidget()
    widget.presentSmall()
}

Script.complete()

/** Lock Screen Widget **/
async function createLockScreenWidget(){

    // Widget base
    const widget = new ListWidget()
    widget.setPadding(0,5,0,0)
    // Widget content
    const content = widget.addStack()
    content.layoutVertically()
    addWidgetData(content, assets)
    widget.addSpacer()

    return widget
}

/** Home Screen Widget **/
async function createHomeScreenWidget(){

    // Widget base
    const widget = new ListWidget()
    widget.backgroundGradient = backgroundGradient()
    const bixiIcon = widget.addImage(assets.bixiIcon)
    bixiIcon.tintColor = Color.white()
    bixiIcon.imageSize = new Size(45,20)
    widget.addSpacer(10)

    // Widget Content
    const content = widget.addStack()
    content.layoutVertically()

    addWidgetData(content)

    widget.addSpacer()
    const footer = widget.addStack()

    // Offline indicator
    if(!isOnline){
        const offlineIcon = SFSymbol.named("antenna.radiowaves.left.and.right.slash")
        const offlineIndicator = footer.addImage(offlineIcon.image)
        offlineIndicator.tintColor = Color.gray()
        offlineIndicator.imageSize = new Size(12,12)
        footer.addSpacer(5)
    }
    // Update date
    const updatedAt = footer.addText("MàJ à ")
    updatedAt.font = settings.update_font
    let date = new Date()
    if(isOnline){
        saveUpdateDate()
    } else {
        date = dateFormatter.date(loadUpdateDate())
    }
    const updateDate = footer.addDate(date)
    updateDate.applyTimeStyle()
    updateDate.font = settings.update_font
    return widget
}

/** Functions **/
// Widget data
function addWidgetData(parentStack){
    // GBFS Data
    gbfs_data = assets.gbfs.data.stations

    for(const [label, id] of Object.entries(settings.stations)){
        // Data
        const gbfs_station_data = gbfs_data.find(station => station.station_id === id)
        ebikes_data = gbfs_station_data.num_ebikes_available
        bikes_data = gbfs_station_data.num_bikes_available - ebikes_data
        parking_data = gbfs_station_data.num_docks_available

        // Station infos
        const station_title = parentStack.addText(label)
        station_title.font = settings.station_font
        if(config.runsInAccessoryWidget)
            station_title.minimumScaleFactor = settings.accessory_scale_factor
        const station_data = parentStack.addStack()

        // Bike infos
        addDataItem(station_data, bikes_data, 'BIKE')

        // eBikes infos
        if (settings.show_ebikes){
            addDataItem(station_data, ebikes_data, 'EBIKE')
        }

        // Parking infos
        addDataItem(station_data, parking_data, 'PARKING')
    }
}

// Item data
function addDataItem(parentStack, data, type){
    const itemCount = parentStack.addText(data.toString())
    itemCount.font = settings.figures_font
    let iconType, iconTint = undefined
    switch (type){
        case 'BIKE':
            iconType = assets.bikeIcon
            iconTint = settings.bike_color
            break
        case 'EBIKE':
            iconType = assets.ebikeIcon
            iconTint = settings.ebike_color
            break
        case 'PARKING':
            iconType = assets.parkingIcon
            iconTint = settings.parking_color
            break
    }
    const itemIcon = parentStack.addImage(iconType)
    itemIcon.tintColor = iconTint
    itemIcon.imageSize = settings.icon_size
    parentStack.addSpacer(5)
}

// Widget Background
function backgroundGradient() {
    const gradient = new LinearGradient()
    gradient.locations = [0,1]
    gradient.colors = [
        new Color("141414"),
        new Color("13233F")
    ]
    return gradient
}

// Online Check
async function onlineCheck(){
    try {
        await new Request(settings.assets_base_url + "ping.txt").load()
        console.log('Device is online')
        return true
    } catch(e) {
        console.log("Device is offline")
        return false
    }
}

// Cache check
function isCached(fileName){
    const filePath = files.joinPath(cachePath, fileName)
    return files.fileExists(filePath)
}

// Images loading and caching
function cacheImage(imageName, imageFile){
    const imagePath = files.joinPath(cachePath, imageName)
    return files.writeImage(imagePath, imageFile)
}
async function loadOnlineImage(imageUrl) {
    const req = new Request(imageUrl)
    return await req.loadImage()
}
function loadCachedImage(imageFile){
    return files.readImage(files.joinPath(cachePath, imageFile))
}
async function loadIcon(iconFile){
    if(!isCached(iconFile)){
        const icon = await loadOnlineImage(settings.assets_base_url + iconFile)
        cacheImage(iconFile, icon)
        return icon
    } else {
        return loadCachedImage(iconFile)
    }
}

// Last update
function saveUpdateDate(){
    const updateDate = new Date()
    const updateDatePath = files.joinPath(cachePath, "lastUpdate.txt")
    const stringDate = dateFormatter.string(updateDate)
    files.writeString(updateDatePath, stringDate)
}
function loadUpdateDate(){
    const updateDatePath = files.joinPath(cachePath, "lastUpdate.txt")
    return files.readString(updateDatePath)
}

// Gbfs loading and caching
function cacheGbfs(gbfsFile){
    return files.writeString(getGbfsPath(), gbfsFile)
}
async function loadOnlineGbfs(){
    const req = new Request(settings.gbfs_stations_status_url)
    const json =  await req.loadJSON()
    return JSON.stringify(json)
}
function loadCachedGbfs(){
    let gbfsData = files.readString(getGbfsPath())
    gbfsData = JSON.parse(gbfsData)
    return gbfsData
}
async function loadGbfs(){
    if(isOnline){
        const gbfsFile = await loadOnlineGbfs()
        cacheGbfs(gbfsFile)
        return JSON.parse(gbfsFile)
    } else {
        return loadCachedGbfs()
    }
}
function getGbfsPath(){
    return files.joinPath(cachePath, settings.gbfs_stations_status_file)
}

// Data loading
async function loadAssets() {

    const bixiIcon = await loadIcon("bixi.png")
    const bikeIcon = await loadIcon("bike.png")
    const ebikeIcon = await loadIcon("ebike.png")
    const parkingIcon = await loadIcon("parking.png")
    const gbfsData = await loadGbfs()

    return {"bixiIcon": bixiIcon, "bikeIcon" : bikeIcon, "ebikeIcon" : ebikeIcon, "parkingIcon": parkingIcon, "gbfs": gbfsData}
}
