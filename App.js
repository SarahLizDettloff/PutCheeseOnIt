import React from 'react';
import { Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View } from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { LinearGradient } from 'expo-linear-gradient';
import * as Permissions from 'expo-permissions';
import { DeviceMotion } from 'expo-sensors';
import * as SplashScreen from 'expo-splash-screen';

const cheeses = [ 
  require('./assets/Cheddar.png'),
require('./assets/Havarti.png'),
require('./assets/Gouda.png'),
require('./assets/Swiss.png')];

var myCheese = cheeses[Math.floor(Math.random()*cheeses.length)];


export default class CheeseCamera extends React.Component {
  static defaultProps = {
    countDownTime: 5,
    motionPeriod: 500,
    motionTolerance: 1
  }
  
  state = {
    cheesePresent: false, 
    countDownTime: 5,
    countDownStarted: false,
    detectMotion: false,
    faceDetecting: false,
    faceDetected: false,
    hasCameraPermission: null,
    motion: null, 
    isReady: false,
  };

  countDownTimer = null;

  
  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
  }

  async getCameraAsync() {
    const { Camera, Permissions } = Expo;
    const { status, permissions } = await Permissions.askAsync(Permissions.Camera);
    if (status === 'granted') {
      return ({hasCameraPermission: true});
    } else {
      throw new Error('Camera permission not granted');
    }
  }

  async _loadAssets() {
    return Promise.all([
      Asset.loadAsync([ require('./assets/icon.png'),
      require('./assets/Cheddar.png'),
      require('./assets/Havarti.png'),
      require('./assets/Gouda.png'),
      require('./assets/Swiss.png')])])
    }

    
  componentDidMount(){
    SplashScreen.preventAutoHideAsync();

    this.motionListener = DeviceMotion.addListener(this.onDeviceMotion);
    setTimeout(()=>{ 
      this.detectMotion(true);
    },);
  }

  componentWillUpdate(nextProps, nextState) {
    if (this.state.detectMotion && nextState.motion && this.state.motion){
      if (
        Math.abs(nextState.motion.x - this.state.motion.x) < this.props.motionTolerance
        && Math.abs(nextState.motion.y - this.state.motion.y) < this.props.motionTolerance
        && Math.abs(nextState.motion.z - this.state.motion.z) < this.props.motionTolerance
      ){
        this.detectFaces(true);
        this.detectMotion(false);
      }
    }
  }

  detectMotion =(doDetect)=> {
    this.setState({
      detectMotion: doDetect,
    });
    if (doDetect){
      DeviceMotion.setUpdateInterval(this.props.motionPeriod);
      myCheese
    } else if (!doDetect && this.state.faceDetecting) {
      this.motionListener.remove();
    }
  }

  onDeviceMotion = (rotation)=>{
    this.setState({
      motion: rotation.accelerationIncludingGravity
    });
  }


  detectFaces(doDetect){
    this.setState({
      faceDetecting: doDetect,
    });
  }

  render() {
    const { hasCameraPermission } = this.state;
 
    if (!this.state.isReady) {
      return (
        <View style={{ flex: 1 }}>
          <Image
            style={{ height: "100%", width: "100%" }}
            source={require('./assets/splash.gif')}
            onLoad={this._cacheResourcesAsync}
          />
        </View>
      )}
      
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      
      return (
        <View style={styles.flexOne}>
          <Camera 
            style={styles.flexOne} 
            type={this.state.type}
            onFacesDetected={this.state.faceDetecting ? this.handleFacesDetected : undefined }
            onFaceDetectionError={this.handleFaceDetectionError}
            faceDetectorSettings={{
              mode: FaceDetector.Constants.Mode.fast,
              detectLandmarks: FaceDetector.Constants.Mode.none,
              runClassifications: FaceDetector.Constants.Mode.none,
            }}
            ref={ref => {
              this.camera = ref;
            }}
          >
            <View 
            style={styles.gradientView}>
              <LinearGradient colors={['transparent', '#ffd970']} style={styles.flexOne}>
                <Text style={styles.textTeaser}>
                  {this.state.faceDetected ? 'Put Cheese on It!' : 'I can\'t see you'}
                </Text>
                <TouchableOpacity
                style={styles.flexOne}
                onPress={() => {
                  this.setState({
                    type: this.state.type === Camera.Constants.Type.back
                      ? Camera.Constants.Type.back
                      : Camera.Constants.Type.front,
                  });
                }}>
                
                <Image source={require('./assets/flip.png')} style={styles.reverse}/>
              </TouchableOpacity>
              </LinearGradient>
            </View>
            <View
              style={{flex: 1,
                backgroundColor: 'transparent',
                flexDirection: 'row',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                
                display: this.state.faceDetected && !this.state.cheesePresent ? 'flex' : 'none'}}>
                <Image source={myCheese} style={{width: 150, 
                  height: 150,
                  overflow: 'hidden'}}/>
            </View>
          </Camera>
        </View>
      );
    };
  }
  
  _cacheSplashResourcesAsync = async () => {
    const gif = require('./assets/splash.gif');
    return Asset.fromModule(gif).downloadAsync();
  };

  _cacheResourcesAsync = async () => {
    SplashScreen.hideAsync();

    try {
      const images = [
        require('./assets/icon.png')
      ];

      const cacheImages = images.map(image => {
        return Asset.fromModule(image).downloadAsync();
      });

      await Promise.all(cacheImages);
    } catch (e) {
      console.warn(e);
    } finally {
      this.setState({ isReady: true });
    }
  };
  handleFacesDetected = ({ faces }) => {
    if (faces.length === 1){
      this.setState({
        faceDetected: true,
      })
      if (!this.state.faceDetected && !this.state.countDownStarted){
        this.initCountDown();
      }
    } else {
      this.setState({faceDetected: false });
      this.cancelCountDown();
    }
  }
  initCountDown = ()=>{
    this.setState({ 
      countDownStarted: true,
    });
    this.countDownTimer = setInterval(this.handleCountDownTime, 1000);
  }
  cancelCountDown = ()=>{
    myCheese = cheeses[Math.floor(Math.random()*cheeses.length)];
    clearInterval(this.countDownTimer);
    this.setState({ 
      countDownTime: this.props.countDownTime,
      countDownStarted: false,
    });
  }
  handleCountDownTime = ()=>{
    if (this.state.countDownTime > 0){
      let newSeconds = this.state.countDownTime-1;
      this.setState({
        countDownTime: newSeconds,
      });
    } else {
      this.cancelCountDown();
      this.cheeseIt();
    }
  }
  cheeseIt = ()=>{
    this.setState({
      cheesePresent: true,
    })
  }
}

const styles = StyleSheet.create({
  textTeaser: {
    fontSize: 20, 
    color: '#f7a918',
    fontWeight: 'bold',
    fontFamily: 'serif',
    marginLeft: 150,
  },
  reverse: {
    width: 55, 
    height: 55,
    borderRadius: 50,       
    left: 20,
    bottom: 20
  },
  gradientView: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
  },
  flexOne: {
    flex: 1
  }
});
