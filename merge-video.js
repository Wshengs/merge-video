import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import axios from 'axios'
import logger from 'logger'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import FormData from 'form-data'

ffmpeg.setFfmpegPath(ffmpegStatic)
ffmpeg.setFfprobePath(ffprobeStatic.path)

export async function handler({ input }) {
  async function downloadVideo(url, outputPath) {
    const res = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
    })

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath)
      res.data.pipe(writer)
      writer.on('finish', () => resolve(true))
      writer.on('error', () => reject(false))
    })
  }

  /**
   * 将 URL 数组的视频合并
   * @param {string[]} urls 视频 URL 数组
   * @param {string} output 输出文件路径
   */
  async function mergeVideosFromUrls(urls, output) {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('urls 必须是非空数组')
    }

    // 创建临时目录
    // const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'public'))
    const tempDir = path.join(__dirname, 'public')

    try {
      // 下载所有视频
      const localFiles = []
      for (let i = 0; i < urls.length; i++) {
        const filePath = path.join(tempDir, `${i}.mp4`)
        logger.info(`⬇️ 下载视频 ${i + 1}/${urls.length}: ${urls[i]}`)
        await downloadVideo(urls[i], filePath)
        localFiles.push(filePath)
      }
      logger.info(localFiles)
      // 使用 fluent-ffmpeg 动态添加输入
      const command = ffmpeg()
      localFiles.forEach(file => command.input(file))

      await new Promise(resolve => {
        // 合并输出
        command
          .complexFilter([
            {
              filter: 'concat',
              options: { n: localFiles.length, v: 1, a: 1 },
              inputs: ['0:v', '0:a', '1:v', '1:a'],
              outputs: ['outv', 'outa'],
            },
          ])
          .outputOptions(['-map [outv]', '-map [outa]'])
          .on('start', cmd => logger.info('ffmpeg 命令:', cmd))
          .on('progress', progress => logger.info('进度:', progress))
          .on('error', err => {
            logger.info('合并出错:', err)
            resolve(true)
          })
          .on('end', () => {
            logger.info('合并完成:', output)
            resolve(true)
          })
          .mergeToFile(output, tempDir) // tempDir 用作临时目录
      })
    } finally {
      // 可以在这里删除临时文件夹（可选）
      // fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  let date = new Date()
  let videoName = date.getDate() + date.getTime() + '.mp4'
  let a = await mergeVideosFromUrls(
    input.videosUrlArr,
    path.resolve(__dirname, videoName),
  )
  logger.info(path.resolve(__dirname, videoName))

  // async function uploadFile(filePath) {
  //   logger.info('开始上传了')
  //   const form = new FormData()

  //   form.append('file', fs.createReadStream(filePath))

  //   const res = await axios.post('http://101.200.91.141:3001/upload', form, {
  //     headers: form.getHeaders(),
  //   })

  //   logger.info(res.data)
  // }

  // 示例

  // await uploadFile(path.resolve(__dirname, videoName))

  return {
    video_url: `http://101.200.91.141:3001/${videoName}`,
  }
}
