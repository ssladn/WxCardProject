const _toString = Object.prototype.toString

function isFunction(obj) {
  return typeof obj === 'function' || false
}

function isObject(obj) {
  return obj.toString() === '[object Object]' || false
}

let _state = null
const _subjects = [] // 用来存储页面实例对象
const _observers = [] // 用来存储状态响应器

/**
 * 仿写react-redux的connect简单工厂
 *
 * @param { Function } mapStateToData
 * @param { Function } mapMethodTopPage
 * @returns { Function } constructorConnect
 */
function connect(mapStateToData, mapMethodTopPage) {
  if (mapStateToData !== undefined && !isFunction(mapStateToData)) {
    throw new Error(
      `connect first param accept a function, but got a ${typeof mapStateToData}`
    )
  }
  if (mapMethodTopPage !== undefined && !isFunction(mapMethodTopPage)) {
    throw new Error(
      `connect second param accept a function, but got a ${typeof mapMethodTopPage}`
    )
  }
  // mapStateToData接收state参数，且必须返回一个绑定对象，key会被绑定到page实例的data中
  const dataMap = mapStateToData ? mapStateToData(_state) : {}
  // mapMethodTopPage接收setState和state参数，且必须返回一个绑定对象，key会被绑定到page实例上
  const methodMap = mapMethodTopPage ? mapMethodTopPage(setState, _state) : {}
  return function (pageObject) {
    // 接收page对象
    if (!isObject(pageObject)) {
      throw new Error(
        `page object connect accept a page object, but got a ${typeof pageObject}`
      )
    }
    // 遍历绑定data
    for (const dataKey in dataMap) {
      if (pageObject.data) {
        if (pageObject.data[dataKey]) {
          console.warn(
            `page object had data ${dataKey}, connect map will cover this prop.`
          )
        }
        pageObject.data[dataKey] = dataMap[dataKey]
      } else {
        pageObject.data = {
          [dataKey]: dataMap[dataKey]
        }
      }
    }
    // 遍历绑定method
    for (const methodKey in methodMap) {
      if (pageObject[methodKey]) {
        console.warn(
          `page object had method ${methodKey}, connect map will cover this method.`
        )
      }
      pageObject[methodKey] = methodMap[methodKey]
    }
    // 存储onLoad、onUnload周期函数，以便对其做改造
    const onLoad = pageObject.onLoad
    const onUnload = pageObject.onUnload
    pageObject.onLoad = function () {
      // 存储page实例和事件响应器，两者保持同步，一个实例对应一个响应器
      if (!~_subjects.indexOf(this)) {
        // 首次load需要修改data
        this.setData(mapStateToData ? mapStateToData(_state) : {})
        _subjects.push(this)
        _observers.push(() => {
          // mapStateToData生成新的mapData，并使用this.setData更新page状态
          this.setData(mapStateToData ? mapStateToData(_state) : {})
        })
      }
      // 触发原有生命周期函数
      onLoad && onLoad.call(this)
    }
    pageObject.onUnload = function () {
      // 注销响应器
      const index = _subjects.indexOf(this)
      if (!~index) {
        _subjects.splice(index, 1)
        _observers.splice(index, 1)
      }
      // 触发原有生命周期函数
      onUnload && onUnload.call(this)
    }
    return pageObject
  }
}

/**
 * 所有的state状态修改必须通过setState方法，以完成正常的响应
 *
 * @param { Object | Function } state
 */
function setState(state) {
  // state 接收需要更新的state对象或者一个接收state的方法，该方法必须返回一个state更新对象
  let newState = state
  if (isFunction(state)) {
    newState = state(_state)
  }
  // 合并新状态
  _state = Object.assign(_state, newState)
  // 触发响应器
  _observers.forEach(function (observer) {
    isFunction(observer) && observer()
  })
}

/**
 * 创建store对象
 *
 * @param { Object } store
 * @returns { Object } _Store
 */
function createStore(state) {
  if (_state) {
    console.warn(
      'there are multiple store active. This might lead to unexpected results.'
    )
  }
  _state = Object.assign({}, state)
  // 这里返回_Store的原因是因为想通过app实例直接获取
  // const { connect, setState, createStore } = getApp().Store
  return _Store
}

const _Store = {
  connect,
  setState,
  createStore
}

module.exports = _Store