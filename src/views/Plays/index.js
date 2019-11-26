import React, { Component } from 'react'
import { Button, Icon } from 'antd'
import {play, lyric} from '../../common/API'
export default class Plays extends Component {
    constructor(props) {
        super(props)
        this.state = {
            url: "",
            lyric: "",
            oLRC:{
                ti: "", //歌曲名
                ar: "", //演唱者
                al: "", //专辑名
                by: "", //歌词制作人
                lineNo: 0, //当前行
                C_pos: 6, //C位
                offset: 0, //滚动距离（应等于行高
            },
            el: "",
            lyricArr: [],
            i: "",
            time: 0,
            isPaused:false,
            duration: "",
            currentTime: "",
            left: "",
            biaoti:""
        }
        this.getLyric = this.getLyric.bind(this)
        this.getUrl = this.getUrl.bind(this)
        this.renderLyric = this.renderLyric.bind(this)
        this.interval = this.interval.bind(this)
    }
    componentDidMount() {
        this.getUrl();
        this.getLyric();
    }
    format(second) {
        second = parseInt(second)
        var mintule = Math.floor(second / 60) >= 10 ? Math.floor(second / 60) : "0" + Math.floor(second / 60)
        var sec = second % 60 >= 10 ? second % 60 : "0" + second % 60
        return mintule + ":"+ sec
    }
    getUrl() {
        const mid = this.props.location.state.mid;
        console.log(mid)
        this.$http.get(play, {params: {
            mid
        }}).then(res => {
            console.log(res)
            this.setState({
                url: res.data,
            })
            const audio = this.refs.audio;
            const progressBox = this.refs.progressBox;
            const truth = this.refs.truth;
            const circle = this.refs.circle
            audio.oncanplaythrough = () => {
                var duration = audio.duration;
                this.setState({
                    duration: this.format(duration)
                })
            }
            audio.ontimeupdate = () => {
                const currentTime = audio.currentTime;
                this.setState({
                    currentTime:this.format(currentTime)
                })
                const boxWidth = progressBox.clientWidth;
                const scale = currentTime / audio.duration;
                const width = boxWidth * scale;
                truth.style.width = width + "px"
                circle.style.left = width - 2 + 'px'
            }
        })
    }
    getLyric() {
        const songid = this.props.location.state.songid
        this.$http.get(lyric, {
            params: {
                songid
            }
        }).then(res => {
            console.log(res)
            this.setState({
                lyric: res.data.data.lyric
            })
            
            let oLRC = this.state.oLRC
            let lyric = res.data.data.lyric;
            let newArr = []
            if(lyric.length==0) return;
            var lrcs = lyric.split('[换行]');//用"[换行]"拆分成数组
            console.log(lrcs)
            for(var i in lrcs) {//遍历歌词数组
                lrcs[i] = lrcs[i].replace(/(^\s*)|(\s*$)/g, ""); //去除前后空格
                var t = lrcs[i].substring(lrcs[i].indexOf("[") + 1, lrcs[i].indexOf("]"));//取[]间的内容
                var s = t.split(":");//分离:前后文字
                // console.log(s)
                if(isNaN(parseInt(s[0]))) { //不是数值
                    for (var i in oLRC) {
                        if (i != "ms" && i == s[0].toLowerCase()) {
                            oLRC[i] = s[1];
                        }
                    }
                }else { //是数值
                    var arr = lrcs[i].match(/\[(\d+:.+?)\]/g);//提取时间字段，可能有多个
                    var start = 0;
                    for(var k in arr){
                        start += arr[k].length; //计算歌词位置
                    }
                    var content = lrcs[i].substring(start);//获取歌词内容
                    for (var k in arr){
                        var t = arr[k].substring(1, arr[k].length-1);//取[]间的内容
                        var s = t.split(":");//分离:前后文字
                        newArr.push({//对象{t:时间,c:歌词}加入ms数组
                            ltime: (parseFloat(s[0])*60+parseFloat(s[1])).toFixed(3),
                            lstr: content
                        });
                    }
                }
            }
            newArr.sort(function (a, b) {//按时间顺序排序
                return a.t-b.t;
            });
            console.log(newArr)
            console.log(oLRC)
            this.setState({
                lyricArr: newArr,
                biaoti:oLRC.ti
            }, () => {
                this.renderLyric()
            })
        })
    }
    renderLyric() {
        console.log(this.state.lyricArr)
        const el = this.state.lyricArr.map((item, index) => {
            return <p key={index} className={["lyric-item", this.state.i == index ? "act" : ""].join(" ")}>{item.lstr}</p>
        })
        this.setState({
            el
        })
    }
    interval() {
        this.timer = setInterval(() => {
            var audio = this.refs.audio
            this.state.lyricArr.forEach((item, index) => {
                if (audio.currentTime > Number(item.ltime)) {
                    this.setState({
                        i: index
                    },() => {
                        this.renderLyric()
                        const box = this.refs.box;
                        box.style.top = - index * 35 + 220 +  'px'
                    })
                }
            })
            this.setState({
                time: audio.currentTime
            })
        }, 1000)
    }
    move(e) {
        this.refs.audio.pause()
        let left = e.touches[0].pageX - 50;
        if(left < 0) {
            left = 0;
        } else if(left > this.refs.progressBox.clientWidth) {
            left = this.refs.progressBox.clientWidth
        }
        this.refs.circle.style.left = left - 2 + "px"
        this.refs.truth.style.width = left + "px"
        this.setState({
            left
        })
    }
    touchend(){
        this.refs.audio.play()
        let scale = this.state.left / this.refs.progressBox.clientWidth;
        let currentTime = this.refs.audio.duration * scale;
        this.refs.audio.currentTime = currentTime;
        this.setState({
            currentTime:this.format(currentTime)
        })

        let i = this.state.lyricArr.findIndex(item => {
            return item.ltime > currentTime
        })
        this.setState({
            i,
            time:this.state.lyricArr[i].ltime
        },() => {
            this.renderLyric()
            let box = this.refs.box;
            box.style.top = - i * 35 + 220 +  'px';
            clearInterval(this.timer)
            this.timer = null;
            this.interval()
        })
    }
    play() {
        const audio = this.refs.audio;
        if (audio.paused) {
            audio.play()
            this.interval()
            this.setState({
                isPaused:true
            })
            this.subtimer = setInterval(()=>{
                let first = this.state.biaoti.substring(0,1)
                let end = this.state.biaoti.substring(1)
                this.setState({
                    biaoti:end + first
                })
            },1000) 
        } else {
            audio.pause()
            this.setState({
                isPaused:false
            })
            clearInterval(this.timer)
            this.timer = null;
            clearInterval(this.subtimer)
            this.subtimer = null;
        }
    }
    playPrev() {

    }
    playNext() {
        let index = this.props.location.state
        console.log(index) 

    }
    componentWillUnmount() {
        this.refs.audio.pause()
        clearInterval(this.timer)
        this.timer = null;
        clearInterval(this.subtimer)
            this.subtimer = null;
        this.setState = () => {
            return
        }
    }
    render() {
        return (
            <div className="container play">
                <div className="title">
                   <Icon className="down" type="down" />
                   <h3>{this.state.biaoti}</h3>
                </div>
                <div className="lyric-box">
                    <div className="lyrics-panels" ref="box">
                        {this.state.el}
                    </div>
                </div>
                <div className="progress-bar">
                    <span>{this.state.currentTime}</span>
                    <div className="progress-box" ref="progressBox">
                        <div className="progress-truth" ref="truth"></div>
                        <div className="circle" ref="circle" onTouchMove={this.move.bind(this)} onTouchEnd={this.touchend.bind(this)}></div>
                    </div>
                    <span>{this.state.duration}</span>
                </div>
                <div className="btns">
                    <audio src={this.state.url} ref="audio"></audio>
                    <div className="icont-box">
                        <div>MV</div>
                        <div><Icon type="step-backward" /></div>
                        <Icon className="icont" type={this.state.isPaused ? 'pause-circle' :'play-circle'} onClick={()=>this.play()}></Icon>
                        <div><Icon type="step-forward" onClick={()=>this.playNext()}/></div>
                        <div><Icon type="heart" /></div> 
                    </div>
                    <Button type="primary" style={{width:220,height:40,background:'#00e09e',border:"none"}} shape="round" size="large">下载歌曲</Button>
                </div>
            </div>
        )
    }
}
