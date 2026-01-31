import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { handler } from './merge-video.js'

// 上传保存目录
// const UPLOAD_DIR = path.resolve('./uploads')
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()

// Multer 配置：保持原始文件名，限制文件大小
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename: (req, file, cb) => cb(null, file.originalname), // 保持原文件名和格式
// })

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
// })

// // 上传接口
// app.post('/upload', upload.single('file'), (req, res) => {
//   console.log('收到文件:', req.file.originalname, '保存路径:', req.file.path)
//   res.json({ message: '上传成功', filename: req.file.originalname })
// })
app.use(express.json())
app.post('/merge-video', async (req, res) => {
  let { videosUrlArr } = req.body
  let result = await handler({ input: videosUrlArr })
  res.json({ message: '合并成功！', video_url: result.video_url })
})

// 设置防止超时
app.use((req, res, next) => {
  req.setTimeout(20 * 60 * 1000)
  next()
})
app.use(express.static(path.join(process.pwd(), 'public')))
app.listen(3001, '0.0.0.0', () => {
  console.log('上传服务已启动: http://0.0.0.0:3001')
})
